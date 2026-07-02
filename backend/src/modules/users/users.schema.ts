import { z } from 'zod';

/** Update the current user's own profile. All fields optional (partial update). */
export const updateProfileSchema = z.object({
  name: z.string().max(80).optional(),
  bio: z.string().max(300).optional(),
  avatarUrl: z.string().url().optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores')
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
