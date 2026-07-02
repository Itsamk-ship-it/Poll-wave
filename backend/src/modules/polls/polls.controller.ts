import { Request, Response } from 'express';
import { asyncHandler, ok, paginated } from '../../utils/http';
import { getClientIp, detectDevice } from '../../utils/request';
import * as service from './polls.service';
import { computeResults } from './results.service';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const poll = await service.createPoll(req.user!.id, req.body);
  ok(res, poll, 201);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listPolls(req.query as any, {
    currentUserId: req.user?.id ?? null,
    onlyPublic: true,
  });
  paginated(res, result.items, { page: result.page, limit: result.limit, total: result.total });
});

export const mine = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listPolls(req.query as any, {
    authorId: req.user!.id,
    currentUserId: req.user!.id,
  });
  paginated(res, result.items, { page: result.page, limit: result.limit, total: result.total });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const poll = await service.getPoll(req.params.idOrSlug, req.user?.id ?? null);
  // Fire-and-forget view tracking.
  void service.trackView(req.params.idOrSlug, {
    userId: req.user?.id ?? null,
    ip: getClientIp(req),
    device: detectDevice(req.headers['user-agent']),
  });
  ok(res, poll);
});

export const results = asyncHandler(async (req: Request, res: Response) => {
  const poll = await service.getPoll(req.params.idOrSlug, req.user?.id ?? null);
  const data = await computeResults(poll.id);
  ok(res, data);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const poll = await service.updatePoll(req.user!.id, req.params.id, req.body);
  ok(res, poll);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deletePoll(req.user!.id, req.params.id);
  ok(res, { message: 'Poll deleted' });
});

export const duplicate = asyncHandler(async (req: Request, res: Response) => {
  const poll = await service.duplicatePoll(req.user!.id, req.params.id);
  ok(res, poll, 201);
});

export const archive = asyncHandler(async (req: Request, res: Response) => {
  const poll = await service.archivePoll(req.user!.id, req.params.id, req.body?.value);
  ok(res, poll);
});

export const pin = asyncHandler(async (req: Request, res: Response) => {
  const poll = await service.pinPoll(req.user!.id, req.params.id, req.body?.value);
  ok(res, poll);
});

export const close = asyncHandler(async (req: Request, res: Response) => {
  const poll = await service.closePoll(req.user!.id, req.params.id, req.body?.close ?? true);
  ok(res, poll);
});

export const share = asyncHandler(async (req: Request, res: Response) => {
  const origin = (req.headers.origin as string) || process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:3000';
  const info = await service.getShareInfo(req.params.idOrSlug, origin);
  ok(res, info);
});
