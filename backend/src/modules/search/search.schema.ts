import { z } from 'zod';
import { pollTypeEnum } from '../polls/polls.schema';

/** Query params for the unified search endpoint. */
export const searchSchema = z.object({
  q: z.string().trim().max(200).optional(),
  type: pollTypeEnum.optional(),
  category: z.string().optional(), // category slug
  sort: z.enum(['recent', 'popular']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type SearchInput = z.infer<typeof searchSchema>;
