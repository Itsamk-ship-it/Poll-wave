/**
 * Shared shaping of a Prisma poll (with relations) into the API response
 * shape used across polls, search, favorites, dashboard, and profile.
 */

type AnyPoll = Record<string, any>;

export function pollStatus(poll: AnyPoll): 'active' | 'closed' | 'archived' {
  if (poll.isArchived) return 'archived';
  if (poll.closedAt) return 'closed';
  if (poll.expiresAt && new Date(poll.expiresAt) < new Date()) return 'closed';
  return 'active';
}

export function serializeAuthor(user: AnyPoll | null | undefined) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    name: user.name ?? null,
    avatarUrl: user.avatarUrl ?? null,
  };
}

export function serializeOption(o: AnyPoll) {
  return {
    id: o.id,
    text: o.text,
    imageUrl: o.imageUrl ?? null,
    order: o.order,
    voteCount: o.voteCount ?? 0,
  };
}

export interface SerializeOpts {
  currentUserId?: string | null;
}

export function serializePoll(poll: AnyPoll, opts: SerializeOpts = {}) {
  const favorites = poll.favorites as AnyPoll[] | undefined;
  const isFavorited = opts.currentUserId
    ? Boolean(favorites?.some((f) => f.userId === opts.currentUserId))
    : false;

  return {
    id: poll.id,
    slug: poll.slug,
    title: poll.title,
    description: poll.description ?? null,
    coverImage: poll.coverImage ?? null,
    type: poll.type,
    visibility: poll.visibility,
    allowMultiple: poll.allowMultiple,
    oneVotePerIp: poll.oneVotePerIp,
    requireLogin: poll.requireLogin,
    commentsDisabled: poll.commentsDisabled,
    isPinned: poll.isPinned,
    isArchived: poll.isArchived,
    status: pollStatus(poll),
    expiresAt: poll.expiresAt ?? null,
    closedAt: poll.closedAt ?? null,
    createdAt: poll.createdAt,
    updatedAt: poll.updatedAt,
    viewCount: poll.viewCount ?? 0,
    voteCount: poll.voteCount ?? 0,
    category: poll.category
      ? { id: poll.category.id, name: poll.category.name, slug: poll.category.slug, icon: poll.category.icon, color: poll.category.color }
      : null,
    tags: Array.isArray(poll.tags)
      ? poll.tags.map((t: AnyPoll) => (t.tag ? { id: t.tag.id, name: t.tag.name, slug: t.tag.slug } : t))
      : [],
    options: Array.isArray(poll.options) ? poll.options.map(serializeOption) : [],
    author: serializeAuthor(poll.author),
    counts: {
      comments: poll._count?.comments ?? undefined,
      favorites: poll._count?.favorites ?? undefined,
      votes: poll._count?.votes ?? poll.voteCount ?? undefined,
    },
    isFavorited,
  };
}

/** Standard Prisma `include` for fully-hydrated poll reads. */
export const pollInclude = {
  author: { select: { id: true, username: true, name: true, avatarUrl: true } },
  category: true,
  tags: { include: { tag: true } },
  options: { orderBy: { order: 'asc' as const } },
  favorites: { select: { userId: true } },
  _count: { select: { comments: true, favorites: true, votes: true } },
};
