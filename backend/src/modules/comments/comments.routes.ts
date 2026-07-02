import { Router } from 'express';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as ctrl from './comments.controller';
import { commentContentSchema } from './comments.schema';

const router = Router();

/**
 * @openapi
 * /api/comments/poll/{pollId}:
 *   get:
 *     tags: [Comments]
 *     summary: List comments for a poll (newest first)
 *     parameters:
 *       - { in: path, name: pollId, required: true, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: Paginated comments }
 *   post:
 *     tags: [Comments]
 *     summary: Add a comment to a poll
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: pollId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string, minLength: 1, maxLength: 1000 }
 *     responses:
 *       201: { description: Created }
 *       403: { description: Comments disabled }
 *       404: { description: Poll not found }
 */
router.get('/poll/:pollId', optionalAuth, ctrl.listForPoll);
router.post('/poll/:pollId', requireAuth, validate(commentContentSchema), ctrl.create);

/**
 * @openapi
 * /api/comments/{id}:
 *   patch:
 *     tags: [Comments]
 *     summary: Edit your own comment
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string, minLength: 1, maxLength: 1000 }
 *     responses:
 *       200: { description: Updated }
 *       403: { description: Not the owner }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Comments]
 *     summary: Delete a comment (comment owner or poll owner)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Deleted }
 *       403: { description: Not permitted }
 *       404: { description: Not found }
 */
router.patch('/:id', requireAuth, validate(commentContentSchema), ctrl.update);
router.delete('/:id', requireAuth, ctrl.remove);

/**
 * @openapi
 * /api/comments/{id}/like:
 *   post:
 *     tags: [Comments]
 *     summary: Like a comment
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Liked, returns like count }
 *   delete:
 *     tags: [Comments]
 *     summary: Remove a like from a comment
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Unliked, returns like count }
 */
router.post('/:id/like', requireAuth, ctrl.like);
router.delete('/:id/like', requireAuth, ctrl.unlike);

export default router;
