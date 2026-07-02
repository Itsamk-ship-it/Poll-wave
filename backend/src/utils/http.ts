import { NextFunction, Request, Response } from 'express';

/** Application-level error carrying an HTTP status code. */
export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(msg = 'Bad request', details?: unknown) {
    return new AppError(400, msg, details);
  }
  static unauthorized(msg = 'Unauthorized') {
    return new AppError(401, msg);
  }
  static forbidden(msg = 'Forbidden') {
    return new AppError(403, msg);
  }
  static notFound(msg = 'Not found') {
    return new AppError(404, msg);
  }
  static conflict(msg = 'Conflict') {
    return new AppError(409, msg);
  }
  static tooMany(msg = 'Too many requests') {
    return new AppError(429, msg);
  }
}

/** Wrap an async route handler so thrown errors reach the error middleware. */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as T, res, next)).catch(next);
  };
}

/** Standard success envelope. */
export function ok(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

/** Paginated success envelope. */
export function paginated(
  res: Response,
  items: unknown[],
  meta: { page: number; limit: number; total: number },
) {
  return res.json({
    success: true,
    data: items,
    meta: {
      ...meta,
      totalPages: Math.max(1, Math.ceil(meta.total / meta.limit)),
    },
  });
}
