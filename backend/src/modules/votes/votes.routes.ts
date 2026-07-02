import { Router } from 'express';
import { optionalAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { voteLimiter } from '../../middleware/rateLimit';
import * as ctrl from './votes.controller';
import { castVoteSchema } from './votes.schema';

const router = Router();

/**
 * @openapi
 * /api/votes:
 *   post:
 *     tags: [Voting]
 *     summary: Cast a vote (supports anonymous, logged-in, single/multiple)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pollId, optionIds]
 *             properties:
 *               pollId: { type: string }
 *               optionIds: { type: array, items: { type: string } }
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *     responses:
 *       201: { description: Vote recorded, returns live results }
 *       400: { description: Poll closed / invalid selection }
 *       409: { description: Already voted }
 */
router.post('/', optionalAuth, voteLimiter, validate(castVoteSchema), ctrl.cast);

/**
 * @openapi
 * /api/votes/{pollId}/status:
 *   get:
 *     tags: [Voting]
 *     summary: Whether the current viewer has voted, and on which options
 *     responses:
 *       200: { description: Vote status }
 */
router.get('/:pollId/status', optionalAuth, ctrl.status);

export default router;
