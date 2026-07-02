import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as ctrl from './notifications.controller';

const router = Router();

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List the current user's notifications (newest first)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Paginated notifications }
 */
router.get('/', requireAuth, ctrl.list);

/**
 * @openapi
 * /api/notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Count of unread notifications for the current user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "{ count }" }
 */
router.get('/unread-count', requireAuth, ctrl.unreadCount);

/**
 * @openapi
 * /api/notifications/{id}/read:
 *   post:
 *     tags: [Notifications]
 *     summary: Mark a single notification read
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Updated notification }
 *       404: { description: Not found }
 */
router.post('/:id/read', requireAuth, ctrl.markRead);

/**
 * @openapi
 * /api/notifications/read-all:
 *   post:
 *     tags: [Notifications]
 *     summary: Mark all notifications read
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "{ updated }" }
 */
router.post('/read-all', requireAuth, ctrl.markAllRead);

/**
 * @openapi
 * /api/notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Delete one of the current user's notifications
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 */
router.delete('/:id', requireAuth, ctrl.remove);

export default router;
