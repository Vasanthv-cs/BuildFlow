import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

const createProjectSchema = z.object({
  name: z.string().min(1),
  clientId: z.string(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.string().optional(), // Decimal string
  address: z.string().optional(),
  description: z.string().optional(),
});

const updateProjectSchema = createProjectSchema.partial();

// GET /api/v1/projects
router.get('/', async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!;
    const { status, search, page = '1', limit = '20' } = req.query as Record<string, string>;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Clients can only see their own projects
    if (role === 'client') {
      const client = await prisma.client.findFirst({ where: { userId } });
      if (client) where.clientId = client.id;
      else {
        res.json({ projects: [], total: 0 });
        return;
      }
    }

    // Workers and supervisors see assigned projects
    if (role === 'worker' || role === 'supervisor') {
      where.assignments = { some: { userId } };
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take,
        include: {
          client: { select: { id: true, name: true } },
          _count: { select: { expenses: true, materials: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.count({ where }),
    ]);

    res.json({ projects, total, page: parseInt(page), limit: take });
  } catch (err) {
    console.error('[projects/GET]', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/v1/projects/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!;
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        expenses: { orderBy: { date: 'desc' }, take: 10 },
        materials: { include: { material: true }, take: 10 },
        _count: { select: { expenses: true, materials: true, assignments: true } },
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Authorization checks
    if (role === 'client') {
      const client = await prisma.client.findFirst({ where: { userId } });
      if (!client || project.clientId !== client.id) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    res.json({ project });
  } catch (err) {
    console.error('[projects/GET/:id]', err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST /api/v1/projects
router.post(
  '/',
  authorize('owner', 'admin'),
  validate(createProjectSchema),
  async (req: Request, res: Response) => {
    try {
      const project = await prisma.project.create({
        data: {
          ...req.body,
          budget: req.body.budget ? req.body.budget : null,
          startDate: req.body.startDate ? new Date(req.body.startDate) : null,
          endDate: req.body.endDate ? new Date(req.body.endDate) : null,
        },
        include: { client: { select: { id: true, name: true } } },
      });
      res.status(201).json({ project });
    } catch (err) {
      console.error('[projects/POST]', err);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }
);

// PATCH /api/v1/projects/:id
router.patch(
  '/:id',
  authorize('owner', 'admin', 'supervisor'),
  validate(updateProjectSchema),
  async (req: Request, res: Response) => {
    try {
      const project = await prisma.project.update({
        where: { id: req.params.id },
        data: {
          ...req.body,
          budget: req.body.budget ? req.body.budget : undefined,
          startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
          endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        },
        include: { client: { select: { id: true, name: true } } },
      });
      res.json({ project });
    } catch (err) {
      console.error('[projects/PATCH/:id]', err);
      res.status(500).json({ error: 'Failed to update project' });
    }
  }
);

// DELETE /api/v1/projects/:id
router.delete('/:id', authorize('owner', 'admin'), async (req: Request, res: Response) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error('[projects/DELETE/:id]', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
