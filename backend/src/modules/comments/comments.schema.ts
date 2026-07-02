import { z } from 'zod';

/** Create or edit a comment. */
export const commentContentSchema = z.object({
  content: z.string().min(1).max(1000),
});

export type CommentContentInput = z.infer<typeof commentContentSchema>;
