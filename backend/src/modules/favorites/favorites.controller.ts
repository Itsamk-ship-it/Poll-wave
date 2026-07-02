import { Request, Response } from 'express';
import { asyncHandler, ok, paginated } from '../../utils/http';
import { parsePagination } from '../../utils/request';
import * as service from './favorites.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await service.listFavorites(req.user!.id, { skip, limit });
  paginated(res, items, { page, limit, total });
});

export const add = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.addFavorite(req.user!.id, req.params.pollId);
  ok(res, result, 201);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.removeFavorite(req.user!.id, req.params.pollId);
  ok(res, result);
});

export const status = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.favoriteStatus(req.user!.id, req.params.pollId);
  ok(res, result);
});
