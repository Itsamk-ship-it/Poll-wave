import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/http';
import { serializePoll, pollInclude } from '../polls/poll.serializer';

/** Paginated polls the current user has saved, newest favorite first. */
export async function listFavorites(userId: string, opts: { skip: number; limit: number }) {
  const where = { userId };
  const [favorites, total] = await Promise.all([
    prisma.favorite.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: opts.skip,
      take: opts.limit,
      include: { poll: { include: pollInclude } },
    }),
    prisma.favorite.count({ where }),
  ]);

  const items = favorites
    .map((f) => f.poll)
    .filter(Boolean)
    .map((p) => serializePoll(p, { currentUserId: userId }));

  return { items, total };
}

/** Save a poll as a favorite (idempotent). Poll must exist. */
export async function addFavorite(userId: string, pollId: string) {
  const poll = await prisma.poll.findUnique({ where: { id: pollId }, select: { id: true } });
  if (!poll) throw AppError.notFound('Poll not found');

  await prisma.favorite.upsert({
    where: { pollId_userId: { pollId, userId } },
    update: {},
    create: { pollId, userId },
  });
  return { favorited: true };
}

/** Remove a poll from the current user's favorites (idempotent). */
export async function removeFavorite(userId: string, pollId: string) {
  await prisma.favorite.deleteMany({ where: { pollId, userId } });
  return { favorited: false };
}

/** Whether the current user has favorited a poll. */
export async function favoriteStatus(userId: string, pollId: string) {
  const favorite = await prisma.favorite.findUnique({
    where: { pollId_userId: { pollId, userId } },
  });
  return { favorited: Boolean(favorite) };
}
