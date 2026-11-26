import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { uploadFile, deleteFile } from '../lib/storage.js';

const router = Router();

// Configure multer memory storage (max 25MB per file)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// GET /api/v1/documents/download - stream local file for secure downloads
router.get('/download', authenticate, async (req: Request, res: Response) => {
  try {
    const key = req.query.key as string;
    if (!key) {
      res.status(400).json({ error: 'Missing key parameter' });
      return;
    }

    // Prevent path traversal
    const safePath = path.resolve(process.cwd(), key);
    if (!safePath.startsWith(path.resolve(process.cwd(), 'uploads'))) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (!fs.existsSync(safePath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    res.sendFile(safePath);
  } catch (err) {
    console.error('[documents/download]', err);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// All subsequent routes require authentication
router.use(authenticate);

// GET /api/v1/documents - list with search & filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!;
    const {
      projectId,
      category,
      search,
      startDate,
      endDate,
      page = '1',
      limit = '30',
    } = req.query as Record<string, string>;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where: Record<string, unknown> = {};

    if (category) {
      where.category = category;
    }

    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { originalName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Role-based scoping
    if (role === 'client') {
      const client = await prisma.client.findFirst({ where: { userId } });
      if (!client) {
        res.json({ documents: [], total: 0 });
        return;
      }
      where.project = { clientId: client.id };
    } else if (role === 'worker') {
      where.project = { assignments: { some: { userId } } };
    }

    if (projectId) {
      where.projectId = projectId;
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip,
        take,
        include: {
          project: { select: { id: true, name: true } },
          progressReport: { select: { id: true, weekStart: true, weekEnd: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.document.count({ where }),
    ]);

    res.json({ documents, total, page: parseInt(page, 10), limit: take });
  } catch (err) {
    console.error('[documents/GET]', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// POST /api/v1/documents - upload a document with file & metadata
router.post(
  '/',
  authorize('owner', 'admin', 'supervisor'),
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      const { name, category, projectId, progressReportId } = req.body;
      const subfolder = category ? `category_${category}` : 'general';

      const uploadResult = await uploadFile(req.file, subfolder);

      const doc = await prisma.document.create({
        data: {
          name: name || req.file.originalname,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          storageKey: uploadResult.storageKey,
          publicUrl: uploadResult.publicUrl,
          category: category || 'general',
          projectId: projectId || null,
          progressReportId: progressReportId || null,
          uploadedById: req.user!.userId,
        },
        include: {
          project: { select: { id: true, name: true } },
        },
      });

      res.status(201).json({ document: doc });
    } catch (err) {
      console.error('[documents/POST]', err);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  }
);

// DELETE /api/v1/documents/:id - delete document
router.delete('/:id', authorize('owner', 'admin'), async (req: Request, res: Response) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
    });

    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    await deleteFile(doc.storageKey);
    await prisma.document.delete({ where: { id: req.params.id } });

    res.json({ message: 'Document deleted' });
  } catch (err) {
    console.error('[documents/DELETE]', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
