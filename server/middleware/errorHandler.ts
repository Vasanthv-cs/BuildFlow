import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isDev = env.NODE_ENV === 'development';

  console.error('[ErrorHandler]', err);

  if (res.headersSent) return;

  if (err instanceof Error) {
    res.status(500).json({
      error: 'Internal server error',
      ...(isDev ? { message: err.message, stack: err.stack } : {}),
    });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}
