import { Router } from 'express';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as ctrl from './polls.controller';
import { createPollSchema, updatePollSchema, listPollsSchema } from './polls.schema';

const router = Router();

/**
 * @openapi
 * /api/polls:
 *   get:
 *     tags: [Polls]
 *     summary: List public polls (explore) with filters, sorting, pagination
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: category, schema: { type: string } }
 *       - { in: query, name: tag, schema: { type: string } }
 *       - { in: query, name: sort, schema: { type: string, enum: [recent, popular, trending, oldest] } }
 *     responses:
 *       200: { description: Paginated polls }
 *   post:
 *     tags: [Polls]
 *     summary: Create a poll
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Created }
 */
router.get('/', optionalAuth, validate(listPollsSchema, 'query'), ctrl.list);
router.post('/', requireAuth, validate(createPollSchema), ctrl.create);

/**
 * @openapi
 * /api/polls/mine:
 *   get:
 *     tags: [Polls]
 *     summary: List the current user's polls (all visibilities)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated polls }
 */
router.get('/mine', requireAuth, validate(listPollsSchema, 'query'), ctrl.mine);

/**
 * @openapi
 * /api/polls/{idOrSlug}:
 *   get:
 *     tags: [Polls]
 *     summary: Get a single poll by id or slug (also records a view)
 *     parameters:
 *       - { in: path, name: idOrSlug, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Poll }
 *       404: { description: Not found }
 */
router.get('/:idOrSlug', optionalAuth, ctrl.getOne);

/**
 * @openapi
 * /api/polls/{idOrSlug}/results:
 *   get:
 *     tags: [Voting]
 *     summary: Get live results for a poll (Redis-backed)
 *     responses:
 *       200: { description: Results payload }
 */
router.get('/:idOrSlug/results', optionalAuth, ctrl.results);

/**
 * @openapi
 * /api/polls/{idOrSlug}/share:
 *   get:
 *     tags: [Polls]
 *     summary: Get shareable URL, embed code, and social links
 *     responses:
 *       200: { description: Share info }
 */
router.get('/:idOrSlug/share', optionalAuth, ctrl.share);

// Mutations (owner only)
router.patch('/:id', requireAuth, validate(updatePollSchema), ctrl.update);
router.delete('/:id', requireAuth, ctrl.remove);
router.post('/:id/duplicate', requireAuth, ctrl.duplicate);
router.post('/:id/archive', requireAuth, ctrl.archive);
router.post('/:id/pin', requireAuth, ctrl.pin);
router.post('/:id/close', requireAuth, ctrl.close);

export default router;
