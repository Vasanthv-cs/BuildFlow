import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

const workerSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  dailyWage: z.string().optional(), // Decimal string
  overtimeRate: z.string().optional(),
  joinDate: z.string().optional(),
  skills: z.array(z.string()).optional(),
  emergencyContact: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/v1/workers
router.get('/', async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!;
    const { search, page = '1', limit = '20' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Workers can only see their own profile
    if (role === 'worker') {
      const worker = await prisma.worker.findFirst({
        where: { userId },
        include: { _count: { select: { attendance: true } } },
      });
      res.json({ workers: worker ? [worker] : [], total: worker ? 1 : 0 });
      return;
    }

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { role: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
          ],
        }
      : {};

    const [workers, total] = await Promise.all([
      prisma.worker.findMany({
        where,
        skip,
        take,
        include: {
          _count: { select: { attendance: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.worker.count({ where }),
    ]);

    res.json({ workers, total });
  } catch (err) {
    console.error('[workers/GET]', err);
    res.status(500).json({ error: 'Failed to fetch workers' });
  }
});

// GET /api/v1/workers/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!;

    const worker = await prisma.worker.findUnique({
      where: { id: req.params.id },
      include: {
        attendance: { orderBy: { date: 'desc' }, take: 30 },
        wages: { orderBy: { weekStart: 'desc' }, take: 10 },
      },
    });

    if (!worker) {
      res.status(404).json({ error: 'Worker not found' });
      return;
    }

    // Worker can only see their own record
    if (role === 'worker' && worker.userId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({ worker });
  } catch (err) {
    console.error('[workers/GET/:id]', err);
    res.status(500).json({ error: 'Failed to fetch worker' });
  }
});

// POST /api/v1/workers
router.post(
  '/',
  authorize('owner', 'admin'),
  validate(workerSchema),
  async (req: Request, res: Response) => {
    try {
      const worker = await prisma.worker.create({
        data: {
          ...req.body,
          joinDate: req.body.joinDate ? new Date(req.body.joinDate) : null,
          skills: req.body.skills ?? [],
        },
      });
      res.status(201).json({ worker });
    } catch (err) {
      console.error('[workers/POST]', err);
      res.status(500).json({ error: 'Failed to create worker' });
    }
  }
);

// PATCH /api/v1/workers/:id
router.patch(
  '/:id',
  authorize('owner', 'admin'),
  validate(workerSchema.partial()),
  async (req: Request, res: Response) => {
    try {
      const worker = await prisma.worker.update({
        where: { id: req.params.id },
        data: {
          ...req.body,
          joinDate: req.body.joinDate ? new Date(req.body.joinDate) : undefined,
        },
      });
      res.json({ worker });
    } catch (err) {
      console.error('[workers/PATCH/:id]', err);
      res.status(500).json({ error: 'Failed to update worker' });
    }
  }
);

// DELETE /api/v1/workers/:id
router.delete('/:id', authorize('owner', 'admin'), async (req: Request, res: Response) => {
  try {
    await prisma.worker.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ message: 'Worker deactivated' });
  } catch (err) {
    console.error('[workers/DELETE/:id]', err);
    res.status(500).json({ error: 'Failed to deactivate worker' });
  }
});

export default router;
