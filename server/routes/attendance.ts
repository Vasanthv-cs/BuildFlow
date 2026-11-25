import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

const attendanceSchema = z.object({
  workerId: z.string(),
  projectId: z.string(),
  date: z.string(), // ISO date string
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  status: z.enum(['present', 'absent', 'half_day', 'overtime']),
  notes: z.string().optional(),
});

const bulkAttendanceSchema = z.object({
  projectId: z.string(),
  date: z.string(),
  records: z.array(
    z.object({
      workerId: z.string(),
      status: z.enum(['present', 'absent', 'half_day', 'overtime']),
      checkIn: z.string().optional(),
      checkOut: z.string().optional(),
      notes: z.string().optional(),
    })
  ),
});

// GET /api/v1/attendance
router.get('/', async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!;
    const { projectId, workerId, startDate, endDate, page = '1', limit = '50' } =
      req.query as Record<string, string>;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    // Workers can only see their own attendance
    if (role === 'worker') {
      const worker = await prisma.worker.findFirst({ where: { userId } });
      if (worker) where.workerId = worker.id;
      else {
        res.json({ attendance: [], total: 0 });
        return;
      }
    } else if (workerId) {
      where.workerId = workerId;
    }

    const [attendance, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take,
        include: {
          worker: { select: { id: true, name: true, role: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.attendance.count({ where }),
    ]);

    res.json({ attendance, total });
  } catch (err) {
    console.error('[attendance/GET]', err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// POST /api/v1/attendance (single record)
router.post(
  '/',
  authorize('owner', 'admin', 'supervisor'),
  validate(attendanceSchema),
  async (req: Request, res: Response) => {
    try {
      const record = await prisma.attendance.upsert({
        where: {
          workerId_projectId_date: {
            workerId: req.body.workerId,
            projectId: req.body.projectId,
            date: new Date(req.body.date),
          },
        },
        update: {
          status: req.body.status,
          checkIn: req.body.checkIn,
          checkOut: req.body.checkOut,
          notes: req.body.notes,
        },
        create: {
          workerId: req.body.workerId,
          projectId: req.body.projectId,
          date: new Date(req.body.date),
          status: req.body.status,
          checkIn: req.body.checkIn,
          checkOut: req.body.checkOut,
          notes: req.body.notes,
        },
        include: {
          worker: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      });
      res.status(201).json({ record });
    } catch (err) {
      console.error('[attendance/POST]', err);
      res.status(500).json({ error: 'Failed to save attendance' });
    }
  }
);

// POST /api/v1/attendance/bulk
router.post(
  '/bulk',
  authorize('owner', 'admin', 'supervisor'),
  validate(bulkAttendanceSchema),
  async (req: Request, res: Response) => {
    try {
      const { projectId, date, records } = req.body as z.infer<typeof bulkAttendanceSchema>;
      const dateObj = new Date(date);

      const results = await prisma.$transaction(
        records.map((r) =>
          prisma.attendance.upsert({
            where: {
              workerId_projectId_date: {
                workerId: r.workerId,
                projectId,
                date: dateObj,
              },
            },
            update: {
              status: r.status,
              checkIn: r.checkIn,
              checkOut: r.checkOut,
              notes: r.notes,
            },
            create: {
              workerId: r.workerId,
              projectId,
              date: dateObj,
              status: r.status,
              checkIn: r.checkIn,
              checkOut: r.checkOut,
              notes: r.notes,
            },
          })
        )
      );

      res.json({ saved: results.length });
    } catch (err) {
      console.error('[attendance/bulk]', err);
      res.status(500).json({ error: 'Failed to save bulk attendance' });
    }
  }
);

export default router;
