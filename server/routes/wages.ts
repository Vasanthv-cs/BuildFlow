import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

const wageSettingsSchema = z.object({
  workerId: z.string(),
  dailyWage: z.string(),
  overtimeMultiplier: z.string().optional(), // e.g., "1.5"
  effectiveFrom: z.string(),
});

const wageRunSchema = z.object({
  workerId: z.string(),
  projectId: z.string().optional(),
  weekStart: z.string(),
  weekEnd: z.string(),
  notes: z.string().optional(),
});

const advanceSchema = z.object({
  workerId: z.string(),
  amount: z.string(),
  date: z.string(),
  notes: z.string().optional(),
});

// Wage calculation engine — server authoritative
function calculateWages(params: {
  attendanceRecords: Array<{ status: string; checkIn?: string | null; checkOut?: string | null }>;
  dailyWage: number;
  overtimeMultiplier: number;
}) {
  let normalDays = 0;
  let halfDays = 0;
  let overtimeDays = 0;
  let absentDays = 0;

  for (const rec of params.attendanceRecords) {
    switch (rec.status) {
      case 'present': normalDays++; break;
      case 'half_day': halfDays++; break;
      case 'overtime': overtimeDays++; break;
      case 'absent': absentDays++; break;
    }
  }

  const normalEarnings = normalDays * params.dailyWage;
  const halfEarnings = halfDays * params.dailyWage * 0.5;
  const overtimeEarnings = overtimeDays * params.dailyWage * params.overtimeMultiplier;
  const totalEarnings = normalEarnings + halfEarnings + overtimeEarnings;

  return {
    normalDays,
    halfDays,
    overtimeDays,
    absentDays,
    normalEarnings: normalEarnings.toFixed(2),
    halfEarnings: halfEarnings.toFixed(2),
    overtimeEarnings: overtimeEarnings.toFixed(2),
    grossWage: totalEarnings.toFixed(2),
  };
}

// GET /api/v1/wages
router.get('/', async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!;
    const { workerId, projectId, weekStart, weekEnd, page = '1', limit = '20' } =
      req.query as Record<string, string>;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (weekStart) where.weekStart = { gte: new Date(weekStart) };
    if (weekEnd) where.weekEnd = { lte: new Date(weekEnd) };

    if (role === 'worker') {
      const worker = await prisma.worker.findFirst({ where: { userId } });
      if (worker) where.workerId = worker.id;
      else {
        res.json({ wages: [], total: 0 });
        return;
      }
    } else if (workerId) {
      where.workerId = workerId;
    }

    const [wages, total] = await Promise.all([
      prisma.wage.findMany({
        where,
        skip,
        take,
        include: { worker: { select: { id: true, name: true } } },
        orderBy: { weekStart: 'desc' },
      }),
      prisma.wage.count({ where }),
    ]);

    res.json({ wages, total });
  } catch (err) {
    console.error('[wages/GET]', err);
    res.status(500).json({ error: 'Failed to fetch wages' });
  }
});

// POST /api/v1/wages/calculate — calculate but don't save
router.post(
  '/calculate',
  authorize('owner', 'admin', 'supervisor'),
  validate(wageRunSchema),
  async (req: Request, res: Response) => {
    try {
      const { workerId, projectId, weekStart, weekEnd } = req.body as z.infer<typeof wageRunSchema>;

      const worker = await prisma.worker.findUnique({ where: { id: workerId } });
      if (!worker) {
        res.status(404).json({ error: 'Worker not found' });
        return;
      }

      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          workerId,
          ...(projectId ? { projectId } : {}),
          date: { gte: new Date(weekStart), lte: new Date(weekEnd) },
        },
      });

      const dailyWage = parseFloat(worker.dailyWage?.toString() ?? '0');
      const overtimeMultiplier = parseFloat(worker.overtimeMultiplier?.toString() ?? '1.5');

      const breakdown = calculateWages({ attendanceRecords, dailyWage, overtimeMultiplier });

      // Pending advances
      const advances = await prisma.advance.findMany({
        where: { workerId, status: 'pending' },
      });
      const totalAdvances = advances.reduce(
        (sum: number, a: any) => sum + parseFloat(a.amount?.toString() || '0'),
        0
      );

      const netWage = Math.max(0, parseFloat(breakdown.grossWage) - totalAdvances);

      res.json({
        workerId,
        workerName: worker.name,
        weekStart,
        weekEnd,
        dailyWage,
        ...breakdown,
        totalAdvances: totalAdvances.toFixed(2),
        netWage: netWage.toFixed(2),
        attendanceCount: attendanceRecords.length,
      });
    } catch (err) {
      console.error('[wages/calculate]', err);
      res.status(500).json({ error: 'Failed to calculate wages' });
    }
  }
);

// POST /api/v1/wages/approve — save final approved wage record
router.post(
  '/approve',
  authorize('owner', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const { workerId, projectId, weekStart, weekEnd, grossWage, totalAdvances, netWage, notes } =
        req.body as {
          workerId: string;
          projectId?: string;
          weekStart: string;
          weekEnd: string;
          grossWage: string;
          totalAdvances: string;
          netWage: string;
          notes?: string;
        };

      const wage = await prisma.$transaction(async (tx: any) => {
        const record = await tx.wage.create({
          data: {
            workerId,
            projectId,
            weekStart: new Date(weekStart),
            weekEnd: new Date(weekEnd),
            grossWage,
            deductions: totalAdvances,
            netWage,
            status: 'approved',
            approvedById: req.user!.userId,
            notes,
          },
        });

        // Mark pending advances as deducted
        await tx.advance.updateMany({
          where: { workerId, status: 'pending' },
          data: { status: 'deducted', wageId: record.id },
        });

        return record;
      });

      res.status(201).json({ wage });
    } catch (err) {
      console.error('[wages/approve]', err);
      res.status(500).json({ error: 'Failed to approve wage' });
    }
  }
);

// POST /api/v1/wages/advances
router.post(
  '/advances',
  authorize('owner', 'admin', 'supervisor'),
  validate(advanceSchema),
  async (req: Request, res: Response) => {
    try {
      const advance = await prisma.advance.create({
        data: {
          workerId: req.body.workerId,
          amount: req.body.amount,
          date: new Date(req.body.date),
          notes: req.body.notes,
          recordedById: req.user!.userId,
          status: 'pending',
        },
        include: { worker: { select: { id: true, name: true } } },
      });
      res.status(201).json({ advance });
    } catch (err) {
      console.error('[wages/advances]', err);
      res.status(500).json({ error: 'Failed to record advance' });
    }
  }
);

// GET /api/v1/wages/settings/:workerId
router.get('/settings/:workerId', authorize('owner', 'admin'), async (req: Request, res: Response) => {
  try {
    const worker = await prisma.worker.findUnique({
      where: { id: req.params.workerId },
      select: { id: true, name: true, dailyWage: true, overtimeMultiplier: true },
    });
    if (!worker) {
      res.status(404).json({ error: 'Worker not found' });
      return;
    }
    res.json({ settings: worker });
  } catch (err) {
    console.error('[wages/settings]', err);
    res.status(500).json({ error: 'Failed to fetch wage settings' });
  }
});

// PATCH /api/v1/wages/settings/:workerId
router.patch(
  '/settings/:workerId',
  authorize('owner', 'admin'),
  validate(wageSettingsSchema.partial()),
  async (req: Request, res: Response) => {
    try {
      const worker = await prisma.worker.update({
        where: { id: req.params.workerId },
        data: {
          dailyWage: req.body.dailyWage,
          overtimeMultiplier: req.body.overtimeMultiplier,
        },
        select: { id: true, name: true, dailyWage: true, overtimeMultiplier: true },
      });
      res.json({ settings: worker });
    } catch (err) {
      console.error('[wages/settings/PATCH]', err);
      res.status(500).json({ error: 'Failed to update wage settings' });
    }
  }
);

export default router;
