import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { redis, keys, cacheDel } from '../../config/redis';
import { AppError } from '../../utils/http';
import { pollSlug, slugify } from '../../utils/slug';
import { hashIp } from '../../utils/crypto';
import { pollsRepository } from './polls.repository';
import { serializePoll, pollStatus } from './poll.serializer';
import { hydrateCounters } from './results.service';
import { CreatePollInput, UpdatePollInput } from './polls.schema';

/** Build the default option set for auto-generated poll types. */
function defaultOptions(type: string, provided?: CreatePollInput['options']) {
  if (provided && provided.length) {
    return provided.map((o, i) => ({ text: o.text, imageUrl: o.imageUrl ?? null, order: o.order ?? i }));
  }
  switch (type) {
    case 'YES_NO':
      return [
        { text: 'Yes', imageUrl: null, order: 0 },
        { text: 'No', imageUrl: null, order: 1 },
      ];
    case 'RATING':
      return [1, 2, 3, 4, 5].map((n, i) => ({ text: String(n), imageUrl: null, order: i }));
    case 'EMOJI':
      return ['😍', '😀', '😐', '😞', '😡'].map((e, i) => ({ text: e, imageUrl: null, order: i }));
    default:
      return [];
  }
}

/** Resolve tag names to Tag records (create-if-missing) and return connect payload. */
async function connectTags(tagNames: string[]) {
  const tags = await Promise.all(
    tagNames.map((name) => {
      const slug = slugify(name);
      return prisma.tag.upsert({
        where: { slug },
        update: {},
        create: { name, slug },
      });
    }),
  );
  return tags.map((t) => ({ tag: { connect: { id: t.id } } }));
}

/** Enforce read access for private/unlisted polls. */
export function assertCanView(poll: any, userId?: string | null) {
  if (poll.visibility === 'PRIVATE' && poll.authorId !== userId) {
    throw AppError.forbidden('This poll is private');
  }
}

function assertOwner(poll: any, userId: string) {
  if (poll.authorId !== userId) throw AppError.forbidden('You do not own this poll');
}

export async function createPoll(userId: string, input: CreatePollInput) {
  const options = defaultOptions(input.type, input.options);
  if (options.length < 2) throw AppError.badRequest('A poll needs at least two options');

  const data: Prisma.PollCreateInput = {
    slug: pollSlug(input.title),
    title: input.title,
    description: input.description ?? null,
    coverImage: input.coverImage ?? null,
    type: input.type,
    visibility: input.visibility,
    allowMultiple: input.allowMultiple ?? input.type === 'MULTIPLE_CHOICE',
    oneVotePerIp: input.oneVotePerIp ?? false,
    requireLogin: input.requireLogin ?? input.visibility === 'PRIVATE',
    commentsDisabled: input.commentsDisabled ?? false,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    author: { connect: { id: userId } },
    category: input.categoryId ? { connect: { id: input.categoryId } } : undefined,
    options: { create: options },
    tags: input.tags?.length ? { create: await connectTags(input.tags) } : undefined,
  };

  const poll = await pollsRepository.create(data);
  await hydrateCounters(poll.id);
  return serializePoll(poll, { currentUserId: userId });
}

export async function getPoll(idOrSlug: string, userId?: string | null) {
  const poll = await pollsRepository.findByIdOrSlug(idOrSlug);
  if (!poll) throw AppError.notFound('Poll not found');
  assertCanView(poll, userId);
  return serializePoll(poll, { currentUserId: userId });
}

export async function listPolls(
  params: {
    page?: number;
    limit?: number;
    category?: string;
    tag?: string;
    type?: string;
    sort?: string;
    status?: string;
  },
  opts: { authorId?: string; currentUserId?: string | null; onlyPublic?: boolean } = {},
) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 12;
  const skip = (page - 1) * limit;

  const where: Prisma.PollWhereInput = { isArchived: false };
  if (opts.authorId) where.authorId = opts.authorId;
  if (opts.onlyPublic) where.visibility = 'PUBLIC';
  if (params.type) where.type = params.type as any;
  if (params.category) where.category = { slug: params.category };
  if (params.tag) where.tags = { some: { tag: { slug: params.tag } } };

  const now = new Date();
  if (params.status === 'active') {
    where.closedAt = null;
    where.OR = [{ expiresAt: null }, { expiresAt: { gt: now } }];
  } else if (params.status === 'closed') {
    where.OR = [{ closedAt: { not: null } }, { expiresAt: { lte: now } }];
  }

  const orderBy: Prisma.PollOrderByWithRelationInput[] =
    params.sort === 'popular'
      ? [{ isPinned: 'desc' }, { voteCount: 'desc' }]
      : params.sort === 'oldest'
        ? [{ createdAt: 'asc' }]
        : [{ isPinned: 'desc' }, { createdAt: 'desc' }];

  // Trending sort uses the Redis sorted set for the ordering of the page.
  if (params.sort === 'trending') {
    return listTrending(page, limit, opts.currentUserId);
  }

  const { items, total } = await pollsRepository.list(where, orderBy, skip, limit);
  return {
    items: items.map((p) => serializePoll(p, { currentUserId: opts.currentUserId })),
    total,
    page,
    limit,
  };
}

async function listTrending(page: number, limit: number, currentUserId?: string | null) {
  const start = (page - 1) * limit;
  const ids = await redis.zrevrange(keys.trending, start, start + limit - 1);
  const total = await redis.zcard(keys.trending);
  if (!ids.length) {
    // Fallback to popular by vote count when trending set is empty.
    const { items, total: t } = await pollsRepository.list(
      { isArchived: false, visibility: 'PUBLIC' },
      [{ voteCount: 'desc' }],
      start,
      limit,
    );
    return { items: items.map((p) => serializePoll(p, { currentUserId })), total: t, page, limit };
  }
  const polls = await prisma.poll.findMany({
    where: { id: { in: ids }, isArchived: false },
    include: (await import('./poll.serializer')).pollInclude,
  });
  const byId = new Map(polls.map((p) => [p.id, p]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as any[];
  return { items: ordered.map((p) => serializePoll(p, { currentUserId })), total, page, limit };
}

export async function updatePoll(userId: string, id: string, input: UpdatePollInput) {
  const poll = await pollsRepository.findRaw(id);
  if (!poll) throw AppError.notFound('Poll not found');
  assertOwner(poll, userId);

  const data: Prisma.PollUpdateInput = {
    title: input.title,
    description: input.description,
    coverImage: input.coverImage,
    visibility: input.visibility,
    expiresAt: input.expiresAt === undefined ? undefined : input.expiresAt ? new Date(input.expiresAt) : null,
    allowMultiple: input.allowMultiple,
    oneVotePerIp: input.oneVotePerIp,
    requireLogin: input.requireLogin,
    commentsDisabled: input.commentsDisabled,
    category:
      input.categoryId === undefined
        ? undefined
        : input.categoryId
          ? { connect: { id: input.categoryId } }
          : { disconnect: true },
  };

  // Replace options wholesale if provided (simple + predictable for editing UI).
  if (input.options) {
    await prisma.pollOption.deleteMany({ where: { pollId: id } });
    data.options = {
      create: input.options.map((o, i) => ({ text: o.text, imageUrl: o.imageUrl ?? null, order: o.order ?? i })),
    };
  }

  if (input.tags) {
    await prisma.pollTag.deleteMany({ where: { pollId: id } });
    data.tags = { create: await connectTags(input.tags) };
  }

  const updated = await pollsRepository.update(id, data);
  await hydrateCounters(id);
  await cacheDel(keys.pollResults(id));
  return serializePoll(updated, { currentUserId: userId });
}

export async function deletePoll(userId: string, id: string) {
  const poll = await pollsRepository.findRaw(id);
  if (!poll) throw AppError.notFound('Poll not found');
  assertOwner(poll, userId);
  await pollsRepository.delete(id);
  await cacheDel(keys.pollResults(id), keys.pollVotes(id), keys.pollVoteTotal(id));
  await redis.zrem(keys.trending, id);
}

export async function duplicatePoll(userId: string, id: string) {
  const poll = await prisma.poll.findUnique({
    where: { id },
    include: { options: { orderBy: { order: 'asc' } }, tags: { include: { tag: true } } },
  });
  if (!poll) throw AppError.notFound('Poll not found');
  assertOwner(poll, userId);

  const copy = await pollsRepository.create({
    slug: pollSlug(poll.title),
    title: `${poll.title} (copy)`,
    description: poll.description,
    coverImage: poll.coverImage,
    type: poll.type,
    visibility: poll.visibility,
    allowMultiple: poll.allowMultiple,
    oneVotePerIp: poll.oneVotePerIp,
    requireLogin: poll.requireLogin,
    commentsDisabled: poll.commentsDisabled,
    expiresAt: poll.expiresAt,
    author: { connect: { id: userId } },
    category: poll.categoryId ? { connect: { id: poll.categoryId } } : undefined,
    options: { create: poll.options.map((o) => ({ text: o.text, imageUrl: o.imageUrl, order: o.order })) },
    tags: { create: poll.tags.map((t) => ({ tag: { connect: { id: t.tagId } } })) },
  });
  await hydrateCounters(copy.id);
  return serializePoll(copy, { currentUserId: userId });
}

async function toggleFlag(userId: string, id: string, field: 'isArchived' | 'isPinned', value?: boolean) {
  const poll = await pollsRepository.findRaw(id);
  if (!poll) throw AppError.notFound('Poll not found');
  assertOwner(poll, userId);
  const next = value ?? !poll[field];
  const updated = await pollsRepository.update(id, { [field]: next } as any);
  return serializePoll(updated, { currentUserId: userId });
}

export const archivePoll = (userId: string, id: string, value?: boolean) =>
  toggleFlag(userId, id, 'isArchived', value);
export const pinPoll = (userId: string, id: string, value?: boolean) =>
  toggleFlag(userId, id, 'isPinned', value);

export async function closePoll(userId: string, id: string, close: boolean) {
  const poll = await pollsRepository.findRaw(id);
  if (!poll) throw AppError.notFound('Poll not found');
  assertOwner(poll, userId);
  const updated = await pollsRepository.update(id, { closedAt: close ? new Date() : null });
  return serializePoll(updated, { currentUserId: userId });
}

export async function getShareInfo(idOrSlug: string, origin: string) {
  const poll = await pollsRepository.findByIdOrSlug(idOrSlug);
  if (!poll) throw AppError.notFound('Poll not found');
  if (poll.visibility === 'PRIVATE') throw AppError.forbidden('Private polls cannot be shared publicly');
  const url = `${origin}/poll/${poll.slug}`;
  const embed = `<iframe src="${origin}/embed/${poll.slug}" width="100%" height="480" frameborder="0" title="${poll.title.replace(/"/g, '&quot;')}"></iframe>`;
  return {
    url,
    embed,
    slug: poll.slug,
    social: {
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(poll.title)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${poll.title} ${url}`)}`,
    },
  };
}

/** Record a poll view (Postgres row + Redis counter), deduped per viewer/day. */
export async function trackView(
  idOrSlug: string,
  meta: { userId?: string | null; ip?: string; device?: string },
) {
  const poll = await pollsRepository.findRaw(idOrSlug).then(
    (p) => p ?? prisma.poll.findUnique({ where: { slug: idOrSlug } }),
  );
  if (!poll) return;
  const ipHash = meta.ip ? hashIp(meta.ip) : null;
  const dedupeKey = `view:${poll.id}:${meta.userId ?? ipHash ?? 'anon'}`;
  const isNew = await redis.set(dedupeKey, '1', 'EX', 3600, 'NX');
  if (!isNew) return; // already counted this viewer within the hour

  await prisma.$transaction([
    prisma.pollView.create({
      data: { pollId: poll.id, userId: meta.userId ?? null, ipHash, device: meta.device ?? null },
    }),
    prisma.poll.update({ where: { id: poll.id }, data: { viewCount: { increment: 1 } } }),
  ]);
  await redis.incr(keys.pollViews(poll.id));
}

export { pollStatus };
