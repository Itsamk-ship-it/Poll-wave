import { z } from 'zod';

/** Create a custom category. */
export const createCategorySchema = z.object({
  name: z.string().min(2).max(40),
  icon: z.string().max(50).optional(),
  color: z
    .string()
    .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color must be a hex value like #RRGGBB')
    .optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
