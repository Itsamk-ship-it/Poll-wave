import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as ctrl from './categories.controller';
import { createCategorySchema } from './categories.schema';

const router = Router();

/**
 * @openapi
 * /api/categories:
 *   get:
 *     tags: [Categories]
 *     summary: List all categories with poll counts (cached)
 *     responses:
 *       200: { description: Categories }
 *   post:
 *     tags: [Categories]
 *     summary: Create a custom category
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, minLength: 2, maxLength: 40 }
 *               icon: { type: string }
 *               color: { type: string, example: '#4f46e5' }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Category already exists }
 */
router.get('/', ctrl.list);
router.post('/', requireAuth, validate(createCategorySchema), ctrl.create);

export default router;
