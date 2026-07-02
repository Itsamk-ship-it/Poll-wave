import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { redis } from '../../config/redis';
import { ok } from '../../utils/http';

const router = Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Liveness + dependency health (Postgres, Redis)
 *     responses:
 *       200: { description: Service healthy }
 *       503: { description: A dependency is unavailable }
 */
router.get('/', async (_req, res) => {
  const checks: Record<string, string> = {};
  let healthy = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.postgres = 'up';
  } catch {
    checks.postgres = 'down';
    healthy = false;
  }

  try {
    const pong = await redis.ping();
    checks.redis = pong === 'PONG' ? 'up' : 'down';
    if (pong !== 'PONG') healthy = false;
  } catch {
    checks.redis = 'down';
    healthy = false;
  }

  const body = { status: healthy ? 'ok' : 'degraded', uptime: process.uptime(), checks };
  if (!healthy) return res.status(503).json({ success: false, data: body });
  return ok(res, body);
});

export default router;
