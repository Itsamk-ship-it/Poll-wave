import { Request, Response } from 'express';
import { asyncHandler, ok, paginated } from '../../utils/http';
import { parsePagination } from '../../utils/request';
import * as service from './notifications.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await service.listForUser(req.user!.id, skip, limit);
  paginated(res, items, { page, limit, total });
});

export const unreadCount = asyncHandler(async (req: Request, res: Response) => {
  const count = await service.unreadCount(req.user!.id);
  ok(res, { count });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const updated = await service.markRead(req.user!.id, req.params.id);
  ok(res, updated);
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  const updated = await service.markAllRead(req.user!.id);
  ok(res, { updated });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.remove(req.user!.id, req.params.id);
  ok(res, { deleted: true });
});
