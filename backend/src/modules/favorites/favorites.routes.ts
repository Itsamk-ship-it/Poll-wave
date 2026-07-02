import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as ctrl from './favorites.controller';

const router = Router();

/**
 * @openapi
 * /api/favorites:
 *   get:
 *     tags: [Favorites]
 *     summary: List the current user's saved polls
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: Paginated saved polls }
 */
router.get('/', requireAuth, ctrl.list);

/**
 * @openapi
 * /api/favorites/{pollId}:
 *   post:
 *     tags: [Favorites]
 *     summary: Save a poll to favorites
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: pollId, required: true, schema: { type: string } }
 *     responses:
 *       201: { description: Favorited }
 *       404: { description: Poll not found }
 *   delete:
 *     tags: [Favorites]
 *     summary: Remove a poll from favorites
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: pollId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Unfavorited }
 */
router.post('/:pollId', requireAuth, ctrl.add);
router.delete('/:pollId', requireAuth, ctrl.remove);

/**
 * @openapi
 * /api/favorites/{pollId}/status:
 *   get:
 *     tags: [Favorites]
 *     summary: Whether the current user has favorited a poll
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: pollId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Favorite status }
 */
router.get('/:pollId/status', requireAuth, ctrl.status);

export default router;
