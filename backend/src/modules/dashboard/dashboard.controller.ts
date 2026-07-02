import { Request, Response } from 'express';
import { asyncHandler, ok } from '../../utils/http';
import * as service from './dashboard.service';

export const get = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.getDashboard(req.user!.id);
  ok(res, data);
});
