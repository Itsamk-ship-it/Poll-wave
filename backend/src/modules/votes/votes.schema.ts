import { z } from 'zod';

export const castVoteSchema = z
  .object({
    pollId: z.string().uuid(),
    optionIds: z.array(z.string().uuid()).min(1).max(30),
    rating: z.number().int().min(1).max(5).optional(),
  })
  .refine((d) => new Set(d.optionIds).size === d.optionIds.length, {
    message: 'Duplicate option ids',
    path: ['optionIds'],
  });

export type CastVoteInput = z.infer<typeof castVoteSchema>;
