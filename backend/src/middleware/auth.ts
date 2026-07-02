import { NextFunction, Request, Response } from 'express';
import { redis, keys } from '../config/redis';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from '../utils/http';

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  if (req.cookies?.accessToken) return req.cookies.accessToken as string;
  return null;
}

/** Require a valid, non-blacklisted access token. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) throw AppError.unauthorized('Authentication required');

    const payload = verifyAccessToken(token);
    const blacklisted = await redis.get(keys.blacklist(payload.jti));
    if (blacklisted) throw AppError.unauthorized('Token has been revoked');

    req.user = { id: payload.sub, role: payload.role, jti: payload.jti };
    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    next(AppError.unauthorized('Invalid or expired token'));
  }
}

/** Attach the user if a valid token is present, but never reject. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) return next();
    const payload = verifyAccessToken(token);
    const blacklisted = await redis.get(keys.blacklist(payload.jti));
    if (!blacklisted) req.user = { id: payload.sub, role: payload.role, jti: payload.jti };
  } catch {
    /* ignore — anonymous request */
  }
  next();
}

/** Require the ADMIN role (must be used after requireAuth). */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') return next(AppError.forbidden('Admin access required'));
  next();
}
