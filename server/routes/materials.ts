import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

const materialSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  category: z.string().optional(),
  description: z.string().optional(),
  minimumStock: z.string().optional(),
  currentStock: z.string().optional(),
  unitCost: z.string().optional(),
});

const materialTxnSchema = z.object({
  materialId: z.string(),
  projectId: z.string().optional(),
  type: z.enum(['purchase', 'consumption', 'return', 'adjustment']),
  quantity: z.string(),
  unitCost: z.string().optional(),
  totalCost: z.string().optional(),
  supplierId: z.string().optional(),
  invoiceNumber: z.string().optional(),
  date: z.string(),
  notes: z.string().optional(),
});

// GET /api/v1/materials
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, category, page = '1', limit = '20' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [materials, total] = await Promise.all([
      prisma.material.findMany({
        where,
        skip,
        take,
        include: { _count: { select: { transactions: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.material.count({ where }),
    ]);

    res.json({ materials, total });
  } catch (err) {
    console.error('[materials/GET]', err);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

// GET /api/v1/materials/:id/transactions
router.get('/:id/transactions', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '30' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await prisma.materialTransaction.findMany({
      where: { materialId: req.params.id },
      skip,
      take: parseInt(limit),
      include: {
        project: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    res.json({ transactions });
  } catch (err) {
    console.error('[materials/transactions]', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST /api/v1/materials
router.post(
  '/',
  authorize('owner', 'admin'),
  validate(materialSchema),
  async (req: Request, res: Response) => {
    try {
      const material = await prisma.material.create({ data: req.body });
      res.status(201).json({ material });
    } catch (err) {
      console.error('[materials/POST]', err);
      res.status(500).json({ error: 'Failed to create material' });
    }
  }
);

// POST /api/v1/materials/transactions (ledger entry)
router.post(
  '/transactions',
  authorize('owner', 'admin', 'supervisor'),
  validate(materialTxnSchema),
  async (req: Request, res: Response) => {
    try {
      const { materialId, quantity, type, unitCost, totalCost, date, ...rest } = req.body as z.infer<typeof materialTxnSchema>;

      const result = await prisma.$transaction(async (tx: any) => {
        const txn = await tx.materialTransaction.create({
          data: {
            materialId,
            type,
            quantity,
            unitCost,
            totalCost,
            date: new Date(date),
            recordedById: req.user!.userId,
            ...rest,
          },
        });

        // Update running stock
        const delta = type === 'purchase' || type === 'return'
          ? parseFloat(quantity)
          : -parseFloat(quantity);

        await tx.material.update({
          where: { id: materialId },
          data: { currentStock: { increment: delta } },
        });

        return txn;
      });

      res.status(201).json({ transaction: result });
    } catch (err) {
      console.error('[materials/transactions/POST]', err);
      res.status(500).json({ error: 'Failed to record material transaction' });
    }
  }
);

// PATCH /api/v1/materials/:id
router.patch(
  '/:id',
  authorize('owner', 'admin'),
  validate(materialSchema.partial()),
  async (req: Request, res: Response) => {
    try {
      const material = await prisma.material.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json({ material });
    } catch (err) {
      console.error('[materials/PATCH/:id]', err);
      res.status(500).json({ error: 'Failed to update material' });
    }
  }
);

export default router;
