import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../utils/http';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ success: false, error: { message: 'Route not found' } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: err.flatten().fieldErrors,
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, details: err.details },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: { message: 'A record with these details already exists' },
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, error: { message: 'Record not found' } });
    }
  }

  console.error('[error]', err);
  res.status(500).json({ success: false, error: { message: 'Internal server error' } });
}
