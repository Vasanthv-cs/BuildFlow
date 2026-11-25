import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

const expenseSchema = z.object({
  projectId: z.string(),
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.string(), // Decimal string
  date: z.string(),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'upi', 'cheque', 'other']).optional(),
  vendorName: z.string().optional(),
  billNumber: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/v1/expenses
router.get('/', async (req: Request, res: Response) => {
  try {
    const { projectId, category, startDate, endDate, page = '1', limit = '20' } =
      req.query as Record<string, string>;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (category) where.category = category;
    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take,
        include: { project: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({ expenses, total });
  } catch (err) {
    console.error('[expenses/GET]', err);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// POST /api/v1/expenses
router.post(
  '/',
  authorize('owner', 'admin', 'supervisor'),
  validate(expenseSchema),
  async (req: Request, res: Response) => {
    try {
      const expense = await prisma.expense.create({
        data: {
          ...req.body,
          date: new Date(req.body.date),
          recordedById: req.user!.userId,
        },
        include: { project: { select: { id: true, name: true } } },
      });
      res.status(201).json({ expense });
    } catch (err) {
      console.error('[expenses/POST]', err);
      res.status(500).json({ error: 'Failed to create expense' });
    }
  }
);

// PATCH /api/v1/expenses/:id
router.patch(
  '/:id',
  authorize('owner', 'admin'),
  validate(expenseSchema.partial()),
  async (req: Request, res: Response) => {
    try {
      const expense = await prisma.expense.update({
        where: { id: req.params.id },
        data: {
          ...req.body,
          date: req.body.date ? new Date(req.body.date) : undefined,
        },
      });
      res.json({ expense });
    } catch (err) {
      console.error('[expenses/PATCH/:id]', err);
      res.status(500).json({ error: 'Failed to update expense' });
    }
  }
);

// DELETE /api/v1/expenses/:id
router.delete('/:id', authorize('owner', 'admin'), async (req: Request, res: Response) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    console.error('[expenses/DELETE/:id]', err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

export default router;
