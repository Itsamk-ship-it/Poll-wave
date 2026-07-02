import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as ctrl from './analytics.controller';

const router = Router();

/**
 * @openapi
 * /api/analytics/poll/{pollId}:
 *   get:
 *     tags: [Analytics]
 *     summary: Owner-only analytics for a single poll
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: pollId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Views, votes, conversion, timelines, breakdowns }
 *       403: { description: Not the poll owner }
 *       404: { description: Poll not found }
 */
router.get('/poll/:pollId', requireAuth, ctrl.pollAnalytics);

export default router;
