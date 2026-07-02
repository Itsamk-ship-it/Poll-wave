import { Request, Response } from 'express';
import { asyncHandler, ok } from '../../utils/http';
import * as service from './analytics.service';

export const pollAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.getPollAnalytics(req.params.pollId, req.user!.id);
  ok(res, data);
});
