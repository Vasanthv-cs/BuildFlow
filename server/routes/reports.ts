import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

const reportSchema = z.object({
  projectId: z.string().optional(),
  supervisorId: z.string().optional(),
  weekStart: z.string(),
  weekEnd: z.string(),
  progressPercent: z.number().min(0).max(100),
  workDone: z.string().min(1),
  issuesFound: z.string().optional(),
  nextWeekPlan: z.string().optional(),
  weatherConditions: z.string().optional(),
  labourCount: z.number().optional(),
  notes: z.string().optional(),
});

// GET /api/v1/reports/progress
router.get('/progress', async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!;
    const { projectId, supervisorId, page = '1', limit = '20' } =
      req.query as Record<string, string>;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;

    if (role === 'supervisor') {
      const sup = await prisma.worker.findFirst({ where: { userId } });
      if (sup) where.supervisorId = sup.id;
    } else if (supervisorId) {
      where.supervisorId = supervisorId;
    }

    if (role === 'client') {
      const client = await prisma.client.findFirst({ where: { userId } });
      if (client) {
        where.project = { clientId: client.id };
        where.isApproved = true; // clients only see approved reports
      } else {
        res.json({ reports: [], total: 0 });
        return;
      }
    }

    const [reports, total] = await Promise.all([
      prisma.progressReport.findMany({
        where,
        skip,
        take,
        include: {
          project: { select: { id: true, name: true } },
          supervisor: { select: { id: true, name: true } },
          _count: { select: { photos: true } },
        },
        orderBy: { weekStart: 'desc' },
      }),
      prisma.progressReport.count({ where }),
    ]);

    res.json({ reports, total });
  } catch (err) {
    console.error('[reports/progress/GET]', err);
    res.status(500).json({ error: 'Failed to fetch progress reports' });
  }
});

// POST /api/v1/reports/progress
router.post(
  '/progress',
  authorize('owner', 'admin', 'supervisor'),
  validate(reportSchema),
  async (req: Request, res: Response) => {
    try {
      let supervisorId = req.body.supervisorId;
      if (!supervisorId && req.user!.role === 'supervisor') {
        const sup = await prisma.worker.findFirst({ where: { userId: req.user!.userId } });
        supervisorId = sup?.id;
      }

      const report = await prisma.progressReport.create({
        data: {
          ...req.body,
          supervisorId,
          weekStart: new Date(req.body.weekStart),
          weekEnd: new Date(req.body.weekEnd),
          isApproved: false,
          submittedById: req.user!.userId,
        },
        include: {
          project: { select: { id: true, name: true } },
          supervisor: { select: { id: true, name: true } },
        },
      });
      res.status(201).json({ report });
    } catch (err) {
      console.error('[reports/progress/POST]', err);
      res.status(500).json({ error: 'Failed to create progress report' });
    }
  }
);

// PATCH /api/v1/reports/progress/:id/approve
router.patch(
  '/progress/:id/approve',
  authorize('owner', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const report = await prisma.progressReport.update({
        where: { id: req.params.id },
        data: { isApproved: true, approvedById: req.user!.userId, approvedAt: new Date() },
      });
      res.json({ report });
    } catch (err) {
      console.error('[reports/progress/approve]', err);
      res.status(500).json({ error: 'Failed to approve report' });
    }
  }
);

// GET /api/v1/reports/financial-summary
router.get('/financial-summary', authorize('owner', 'admin'), async (req: Request, res: Response) => {
  try {
    const { projectId, startDate, endDate } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    const [expenses, payments, wages] = await Promise.all([
      prisma.expense.aggregate({ where, _sum: { amount: true }, _count: true }),
      prisma.clientPayment.aggregate({ where, _sum: { amount: true }, _count: true }),
      prisma.wage.aggregate({
        where: projectId ? { projectId } : {},
        _sum: { netWage: true },
        _count: true,
      }),
    ]);

    const totalExpenses = expenses._sum.amount?.toNumber() ?? 0;
    const totalIncome = payments._sum.amount?.toNumber() ?? 0;
    const totalWages = wages._sum.netWage?.toNumber() ?? 0;
    const netProfit = totalIncome - totalExpenses - totalWages;

    res.json({
      totalExpenses,
      totalIncome,
      totalWages,
      netProfit,
      expenseCount: expenses._count,
      paymentCount: payments._count,
    });
  } catch (err) {
    console.error('[reports/financial-summary]', err);
    res.status(500).json({ error: 'Failed to generate financial summary' });
  }
});

export default router;
