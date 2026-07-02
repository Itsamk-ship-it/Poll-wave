import { Request, Response } from 'express';
import { asyncHandler, ok } from '../../utils/http';
import * as service from './categories.service';

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await service.listCategories();
  ok(res, categories);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const category = await service.createCategory(req.body);
  ok(res, category, 201);
});
