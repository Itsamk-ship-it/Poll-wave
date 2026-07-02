import { Router } from 'express';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as ctrl from './users.controller';
import { updateProfileSchema } from './users.schema';

const router = Router();

/**
 * @openapi
 * /api/users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Update the current user's own profile
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, maxLength: 80 }
 *               bio: { type: string, maxLength: 300 }
 *               avatarUrl: { type: string, format: uri }
 *               username: { type: string, minLength: 3, maxLength: 30 }
 *     responses:
 *       200: { description: Updated profile }
 *       409: { description: Username already taken }
 */
router.patch('/me', requireAuth, validate(updateProfileSchema), ctrl.updateMe);

/**
 * @openapi
 * /api/users/{username}:
 *   get:
 *     tags: [Users]
 *     summary: Public profile with counts and follow status
 *     parameters:
 *       - { in: path, name: username, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Profile }
 *       404: { description: Not found }
 */
router.get('/:username', optionalAuth, ctrl.getProfile);

/**
 * @openapi
 * /api/users/{username}/polls:
 *   get:
 *     tags: [Users]
 *     summary: Paginated public polls authored by a user
 *     parameters:
 *       - { in: path, name: username, required: true, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: Paginated polls }
 *       404: { description: Not found }
 */
router.get('/:username/polls', optionalAuth, ctrl.getUserPolls);

/**
 * @openapi
 * /api/users/{username}/follow:
 *   post:
 *     tags: [Users]
 *     summary: Follow a user
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: username, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Now following }
 *       400: { description: Cannot follow yourself }
 *   delete:
 *     tags: [Users]
 *     summary: Unfollow a user
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: username, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: No longer following }
 */
router.post('/:username/follow', requireAuth, ctrl.follow);
router.delete('/:username/follow', requireAuth, ctrl.unfollow);

export default router;
