import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRouter from './routes/auth.js';
import projectsRouter from './routes/projects.js';
import clientsRouter from './routes/clients.js';
import workersRouter from './routes/workers.js';
import attendanceRouter from './routes/attendance.js';
import expensesRouter from './routes/expenses.js';
import materialsRouter from './routes/materials.js';
import suppliersRouter from './routes/suppliers.js';
import paymentsRouter from './routes/payments.js';
import wagesRouter from './routes/wages.js';
import reportsRouter from './routes/reports.js';

const app = express();

// ── Security middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

// ── Rate limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts. Try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use(cookieParser(env.COOKIE_SECRET));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: env.NODE_ENV });
});

// ── API routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/projects', projectsRouter);
app.use('/api/v1/clients', clientsRouter);
app.use('/api/v1/workers', workersRouter);
app.use('/api/v1/attendance', attendanceRouter);
app.use('/api/v1/expenses', expensesRouter);
app.use('/api/v1/materials', materialsRouter);
app.use('/api/v1/suppliers', suppliersRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/wages', wagesRouter);
app.use('/api/v1/reports', reportsRouter);

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Error handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ─────────────────────────────────────────────────────────────
const port = env.PORT;
app.listen(port, () => {
  console.log(`[BuildFlow API] Server running on port ${port} (${env.NODE_ENV})`);
});

export default app;
