import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as ctrl from './dashboard.controller';

const router = Router();

/**
 * @openapi
 * /api/dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Aggregate stats and highlights for the current user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Dashboard stats, recent and popular polls }
 */
router.get('/', requireAuth, ctrl.get);

export default router;
