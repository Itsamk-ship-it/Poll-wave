import { Request, Response } from 'express';
import { asyncHandler, ok, paginated } from '../../utils/http';
import { parsePagination } from '../../utils/request';
import * as service from './users.service';

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await service.getProfile(req.params.username, req.user?.id ?? null);
  ok(res, profile);
});

export const getUserPolls = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await service.getUserPolls(req.params.username, {
    skip,
    limit,
    currentUserId: req.user?.id ?? null,
  });
  paginated(res, items, { page, limit, total });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await service.updateProfile(req.user!.id, req.body);
  ok(res, user);
});

export const follow = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.followUser(req.user!.id, req.params.username);
  ok(res, result);
});

export const unfollow = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.unfollowUser(req.user!.id, req.params.username);
  ok(res, result);
});
