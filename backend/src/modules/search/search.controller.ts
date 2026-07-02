import { Request, Response } from 'express';
import { asyncHandler, ok } from '../../utils/http';
import { parsePagination } from '../../utils/request';
import * as service from './search.service';
import { SearchInput } from './search.schema';

export const search = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = parsePagination(req.query);
  const result = await service.search(req.query as SearchInput, {
    page,
    limit,
    currentUserId: req.user?.id ?? null,
  });
  ok(res, result);
});
