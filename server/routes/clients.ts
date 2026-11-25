import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, authorize('owner', 'admin', 'supervisor'));

const createClientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  notes: z.string().optional(),
});

const updateClientSchema = createClientSchema.partial();

// GET /api/v1/clients
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, page = '1', limit = '20' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
          ],
        }
      : {};

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take,
        include: { _count: { select: { projects: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.client.count({ where }),
    ]);

    res.json({ clients, total });
  } catch (err) {
    console.error('[clients/GET]', err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// GET /api/v1/clients/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        projects: {
          select: { id: true, name: true, status: true, budget: true },
        },
        payments: { orderBy: { date: 'desc' }, take: 10 },
      },
    });
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    res.json({ client });
  } catch (err) {
    console.error('[clients/GET/:id]', err);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// POST /api/v1/clients
router.post('/', validate(createClientSchema), async (req: Request, res: Response) => {
  try {
    const client = await prisma.client.create({ data: req.body });
    res.status(201).json({ client });
  } catch (err) {
    console.error('[clients/POST]', err);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// PATCH /api/v1/clients/:id
router.patch('/:id', validate(updateClientSchema), async (req: Request, res: Response) => {
  try {
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ client });
  } catch (err) {
    console.error('[clients/PATCH/:id]', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// DELETE /api/v1/clients/:id
router.delete('/:id', authorize('owner', 'admin'), async (req: Request, res: Response) => {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ message: 'Client deleted' });
  } catch (err) {
    console.error('[clients/DELETE/:id]', err);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

export default router;
