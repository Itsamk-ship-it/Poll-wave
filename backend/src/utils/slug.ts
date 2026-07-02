import { nanoid } from 'nanoid';

/** Turn a string into a URL-safe slug fragment. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

/** Unique, shareable poll slug: readable prefix + short random suffix. */
export function pollSlug(title: string): string {
  const base = slugify(title) || 'poll';
  return `${base}-${nanoid(8)}`;
}
