import { z } from 'zod';

export const pollTypeEnum = z.enum([
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'YES_NO',
  'RATING',
  'EMOJI',
  'IMAGE_CHOICE',
]);

export const visibilityEnum = z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']);

const optionSchema = z.object({
  text: z.string().min(1).max(200),
  imageUrl: z.string().url().optional().nullable(),
  order: z.number().int().min(0).optional(),
});

export const createPollSchema = z
  .object({
    title: z.string().min(3).max(200),
    description: z.string().max(2000).optional().nullable(),
    coverImage: z.string().url().optional().nullable(),
    type: pollTypeEnum.default('SINGLE_CHOICE'),
    visibility: visibilityEnum.default('PUBLIC'),
    categoryId: z.string().uuid().optional().nullable(),
    tags: z.array(z.string().min(1).max(30)).max(10).optional(),
    expiresAt: z.string().datetime().optional().nullable(),
    allowMultiple: z.boolean().optional(),
    oneVotePerIp: z.boolean().optional(),
    requireLogin: z.boolean().optional(),
    commentsDisabled: z.boolean().optional(),
    options: z.array(optionSchema).max(30).optional(),
  })
  .refine(
    (d) => {
      // Choice-style polls require at least two explicit options.
      const needsOptions = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'IMAGE_CHOICE'].includes(d.type);
      return !needsOptions || (d.options && d.options.length >= 2);
    },
    { message: 'This poll type requires at least two options', path: ['options'] },
  );

export const updatePollSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  coverImage: z.string().url().optional().nullable(),
  visibility: visibilityEnum.optional(),
  categoryId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().min(1).max(30)).max(10).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  allowMultiple: z.boolean().optional(),
  oneVotePerIp: z.boolean().optional(),
  requireLogin: z.boolean().optional(),
  commentsDisabled: z.boolean().optional(),
  options: z.array(optionSchema.extend({ id: z.string().uuid().optional() })).max(30).optional(),
});

export const listPollsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  category: z.string().optional(),
  tag: z.string().optional(),
  type: pollTypeEnum.optional(),
  sort: z.enum(['recent', 'popular', 'trending', 'oldest']).optional(),
  status: z.enum(['active', 'closed', 'all']).optional(),
});

export type CreatePollInput = z.infer<typeof createPollSchema>;
export type UpdatePollInput = z.infer<typeof updatePollSchema>;
