import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

const supplierSchema = z.object({
  name: z.string().min(1),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  category: z.string().optional(),
  bankDetails: z.string().optional(),
  notes: z.string().optional(),
});

const supplierPaymentSchema = z.object({
  supplierId: z.string(),
  amount: z.string(),
  date: z.string(),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'upi', 'cheque', 'other']).optional(),
  referenceNumber: z.string().optional(),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/v1/suppliers
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
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take,
        include: {
          _count: { select: { payments: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.supplier.count({ where }),
    ]);

    res.json({ suppliers, total });
  } catch (err) {
    console.error('[suppliers/GET]', err);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// POST /api/v1/suppliers
router.post(
  '/',
  authorize('owner', 'admin'),
  validate(supplierSchema),
  async (req: Request, res: Response) => {
    try {
      const supplier = await prisma.supplier.create({ data: req.body });
      res.status(201).json({ supplier });
    } catch (err) {
      console.error('[suppliers/POST]', err);
      res.status(500).json({ error: 'Failed to create supplier' });
    }
  }
);

// PATCH /api/v1/suppliers/:id
router.patch(
  '/:id',
  authorize('owner', 'admin'),
  validate(supplierSchema.partial()),
  async (req: Request, res: Response) => {
    try {
      const supplier = await prisma.supplier.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json({ supplier });
    } catch (err) {
      console.error('[suppliers/PATCH/:id]', err);
      res.status(500).json({ error: 'Failed to update supplier' });
    }
  }
);

// POST /api/v1/suppliers/payments
router.post(
  '/payments',
  authorize('owner', 'admin'),
  validate(supplierPaymentSchema),
  async (req: Request, res: Response) => {
    try {
      const payment = await prisma.supplierPayment.create({
        data: {
          ...req.body,
          date: new Date(req.body.date),
          recordedById: req.user!.userId,
        },
        include: { supplier: { select: { id: true, name: true } } },
      });
      res.status(201).json({ payment });
    } catch (err) {
      console.error('[suppliers/payments/POST]', err);
      res.status(500).json({ error: 'Failed to record supplier payment' });
    }
  }
);

export default router;
