import { Router } from 'express';
import { optionalAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as ctrl from './search.controller';
import { searchSchema } from './search.schema';

const router = Router();

/**
 * @openapi
 * /api/search:
 *   get:
 *     tags: [Search]
 *     summary: Unified search over polls, users, categories, and tags
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         description: Category slug
 *         schema: { type: string }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [recent, popular] }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: "{ polls, users, categories, tags }" }
 */
router.get('/', optionalAuth, validate(searchSchema, 'query'), ctrl.search);

export default router;
