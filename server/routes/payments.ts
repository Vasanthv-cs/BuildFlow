import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

const paymentSchema = z.object({
  projectId: z.string(),
  clientId: z.string(),
  amount: z.string(),
  date: z.string(),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'upi', 'cheque', 'other']).optional(),
  referenceNumber: z.string().optional(),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['pending', 'received', 'overdue']).optional(),
});

// GET /api/v1/payments
router.get('/', async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!;
    const { projectId, clientId, status, page = '1', limit = '20' } =
      req.query as Record<string, string>;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    // Client can only see their own payments
    if (role === 'client') {
      const client = await prisma.client.findFirst({ where: { userId } });
      if (client) where.clientId = client.id;
      else {
        res.json({ payments: [], total: 0 });
        return;
      }
    } else if (clientId) {
      where.clientId = clientId;
    }

    const [payments, total] = await Promise.all([
      prisma.clientPayment.findMany({
        where,
        skip,
        take,
        include: {
          project: { select: { id: true, name: true } },
          client: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.clientPayment.count({ where }),
    ]);

    res.json({ payments, total });
  } catch (err) {
    console.error('[payments/GET]', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// POST /api/v1/payments
router.post(
  '/',
  authorize('owner', 'admin'),
  validate(paymentSchema),
  async (req: Request, res: Response) => {
    try {
      const payment = await prisma.clientPayment.create({
        data: {
          ...req.body,
          date: new Date(req.body.date),
          recordedById: req.user!.userId,
        },
        include: {
          project: { select: { id: true, name: true } },
          client: { select: { id: true, name: true } },
        },
      });
      res.status(201).json({ payment });
    } catch (err) {
      console.error('[payments/POST]', err);
      res.status(500).json({ error: 'Failed to record payment' });
    }
  }
);

// PATCH /api/v1/payments/:id
router.patch(
  '/:id',
  authorize('owner', 'admin'),
  validate(paymentSchema.partial()),
  async (req: Request, res: Response) => {
    try {
      const payment = await prisma.clientPayment.update({
        where: { id: req.params.id },
        data: {
          ...req.body,
          date: req.body.date ? new Date(req.body.date) : undefined,
        },
      });
      res.json({ payment });
    } catch (err) {
      console.error('[payments/PATCH/:id]', err);
      res.status(500).json({ error: 'Failed to update payment' });
    }
  }
);

export default router;
