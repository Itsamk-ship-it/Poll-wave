import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { keys, cacheGet, cacheSet } from '../../config/redis';
import { serializePoll, pollInclude } from '../polls/poll.serializer';
import { Prisma } from '@prisma/client';
import { SearchInput } from './search.schema';

const SEARCH_TTL = 30; // seconds

/** Stable cache key hash built from the query params. */
function hashParams(params: SearchInput): string {
  const json = JSON.stringify({
    q: params.q ?? '',
    type: params.type ?? '',
    category: params.category ?? '',
    sort: params.sort ?? '',
    page: params.page ?? 1,
    limit: params.limit ?? 12,
  });
  return crypto.createHash('sha256').update(json).digest('hex').slice(0, 32);
}

interface RunOpts {
  page: number;
  limit: number;
  currentUserId?: string | null;
}

export interface SearchResponse {
  polls: { items: unknown[]; total: number; page: number; limit: number; totalPages: number };
  users: unknown[];
  categories: unknown[];
  tags: unknown[];
}

/** Execute the search against Postgres (no caching). */
async function runSearch(params: SearchInput, opts: RunOpts): Promise<SearchResponse> {
  const { page, limit, currentUserId } = opts;
  const skip = (page - 1) * limit;
  const q = params.q?.trim();

  const where: Prisma.PollWhereInput = {
    visibility: 'PUBLIC',
    isArchived: false,
  };
  if (params.type) where.type = params.type;
  if (params.category) where.category = { slug: params.category };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { tags: { some: { tag: { name: { contains: q, mode: 'insensitive' } } } } },
    ];
  }

  const orderBy: Prisma.PollOrderByWithRelationInput =
    params.sort === 'popular' ? { voteCount: 'desc' } : { createdAt: 'desc' };

  const [polls, total] = await prisma.$transaction([
    prisma.poll.findMany({ where, include: pollInclude, orderBy, skip, take: limit }),
    prisma.poll.count({ where }),
  ]);

  // Side facets (only meaningful when there's a search term).
  let users: unknown[] = [];
  let categories: unknown[] = [];
  let tags: unknown[] = [];
  if (q) {
    [users, categories, tags] = await Promise.all([
      prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, username: true, name: true, avatarUrl: true },
        take: 5,
      }),
      prisma.category.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        take: 5,
      }),
      prisma.tag.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        take: 5,
      }),
    ]);
  }

  return {
    polls: {
      items: polls.map((p) => serializePoll(p, { currentUserId })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    users,
    categories,
    tags,
  };
}

/** Cached search: caches the full response for 30s when a query term is present. */
export async function search(params: SearchInput, opts: RunOpts): Promise<SearchResponse> {
  const q = params.q?.trim();
  if (!q) return runSearch(params, opts);

  const key = keys.search(hashParams(params));
  const cached = await cacheGet<SearchResponse>(key);
  if (cached) return cached;

  const fresh = await runSearch(params, opts);
  await cacheSet(key, fresh, SEARCH_TTL);
  return fresh;
}
