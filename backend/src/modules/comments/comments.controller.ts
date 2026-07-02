import { Request, Response } from 'express';
import { asyncHandler, ok, paginated } from '../../utils/http';
import { parsePagination } from '../../utils/request';
import * as service from './comments.service';

export const listForPoll = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await service.listForPoll(req.params.pollId, {
    skip,
    limit,
    currentUserId: req.user?.id ?? null,
  });
  paginated(res, items, { page, limit, total });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const comment = await service.addComment(req.params.pollId, req.user!.id, req.body.content);
  ok(res, comment, 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const comment = await service.editComment(req.params.id, req.user!.id, req.body.content);
  ok(res, comment);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.deleteComment(req.params.id, req.user!.id);
  ok(res, result);
});

export const like = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.likeComment(req.params.id, req.user!.id);
  ok(res, result);
});

export const unlike = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.unlikeComment(req.params.id, req.user!.id);
  ok(res, result);
});
