import { prisma } from '../../config/prisma';
import { keys, cacheWrap } from '../../config/redis';
import { serializePoll, pollInclude } from '../polls/poll.serializer';

const DASHBOARD_TTL = 30; // seconds

/** Aggregate dashboard stats for a user (cached 30s). */
export async function getDashboard(userId: string) {
  return cacheWrap(keys.dashboard(userId), DASHBOARD_TTL, async () => {
    const now = new Date();
    const ownActive = { authorId: userId, isArchived: false };

    const [
      totalPolls,
      activePolls,
      closedPolls,
      publicPolls,
      privatePolls,
      aggregates,
      recentPollsRaw,
      popularPollsRaw,
    ] = await prisma.$transaction([
      // Total non-archived polls.
      prisma.poll.count({ where: ownActive }),
      // Active: not closed and (no expiry or expiry in the future).
      prisma.poll.count({
        where: {
          ...ownActive,
          closedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      // Closed: explicitly closed or already expired.
      prisma.poll.count({
        where: {
          ...ownActive,
          OR: [{ closedAt: { not: null } }, { expiresAt: { lte: now } }],
        },
      }),
      prisma.poll.count({ where: { ...ownActive, visibility: 'PUBLIC' } }),
      prisma.poll.count({ where: { ...ownActive, visibility: 'PRIVATE' } }),
      prisma.poll.aggregate({
        where: ownActive,
        _sum: { voteCount: true, viewCount: true },
      }),
      prisma.poll.findMany({
        where: ownActive,
        include: pollInclude,
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.poll.findMany({
        where: ownActive,
        include: pollInclude,
        orderBy: { voteCount: 'desc' },
        take: 5,
      }),
    ]);

    return {
      totalPolls,
      activePolls,
      closedPolls,
      totalVotesReceived: aggregates._sum.voteCount ?? 0,
      publicPolls,
      privatePolls,
      totalViews: aggregates._sum.viewCount ?? 0,
      recentPolls: recentPollsRaw.map((p) => serializePoll(p, { currentUserId: userId })),
      popularPolls: popularPollsRaw.map((p) => serializePoll(p, { currentUserId: userId })),
    };
  });
}
