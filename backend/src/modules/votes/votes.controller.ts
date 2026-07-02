import { Request, Response } from 'express';
import { asyncHandler, ok } from '../../utils/http';
import { getClientIp } from '../../utils/request';
import * as service from './votes.service';

export const cast = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.castVote(req.body, {
    userId: req.user?.id ?? null,
    ip: getClientIp(req),
    userAgent: req.headers['user-agent'],
  });
  ok(res, result, 201);
});

export const status = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.hasVoted(req.params.pollId, {
    userId: req.user?.id ?? null,
    ip: getClientIp(req),
  });
  ok(res, result);
});
