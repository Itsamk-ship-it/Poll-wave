import { prisma } from '../../config/prisma';
import { redis, keys } from '../../config/redis';
import { AppError } from '../../utils/http';
import { hashIp } from '../../utils/crypto';
import { detectDevice, detectBrowser } from '../../utils/request';
import { emitPollResults } from '../../realtime/socket';
import { computeResults, incrementCounter, persistCounters } from '../polls/results.service';
import { notifyVote, notifyMilestone } from '../notifications/notifications.service';
import { CastVoteInput } from './votes.schema';

const MILESTONES = [100, 500, 1000, 5000, 10000];

interface VoteContext {
  userId?: string | null;
  ip?: string;
  userAgent?: string;
}

function pollIsClosed(poll: { closedAt: Date | null; expiresAt: Date | null; isArchived: boolean }): boolean {
  if (poll.isArchived) return true;
  if (poll.closedAt) return true;
  if (poll.expiresAt && poll.expiresAt < new Date()) return true;
  return false;
}

/**
 * Determine whether this viewer has already voted, checking the fast Redis
 * guard first and falling back to Postgres for durability.
 */
async function assertNotAlreadyVoted(
  pollId: string,
  poll: { oneVotePerIp: boolean },
  ctx: VoteContext,
  ipHash: string | null,
) {
  if (ctx.userId) {
    const guard = keys.voteGuardUser(pollId, ctx.userId);
    if (await redis.exists(guard)) throw AppError.conflict('You have already voted on this poll');
    const existing = await prisma.vote.findFirst({ where: { pollId, userId: ctx.userId } });
    if (existing) {
      await redis.set(guard, '1');
      throw AppError.conflict('You have already voted on this poll');
    }
  } else if (poll.oneVotePerIp && ipHash) {
    const guard = keys.voteGuardIp(pollId, ipHash);
    if (await redis.exists(guard)) throw AppError.conflict('A vote has already been cast from this device');
    const existing = await prisma.vote.findFirst({ where: { pollId, ipHash, userId: null } });
    if (existing) {
      await redis.set(guard, '1');
      throw AppError.conflict('A vote has already been cast from this device');
    }
  }
}

export async function castVote(input: CastVoteInput, ctx: VoteContext) {
  const poll = await prisma.poll.findUnique({
    where: { id: input.pollId },
    include: { options: { select: { id: true } } },
  });
  if (!poll) throw AppError.notFound('Poll not found');
  if (pollIsClosed(poll)) throw AppError.badRequest('This poll is closed');

  if (poll.requireLogin && !ctx.userId) {
    throw AppError.unauthorized('You must be logged in to vote on this poll');
  }
  if (poll.visibility === 'PRIVATE' && poll.authorId !== ctx.userId) {
    throw AppError.forbidden('This poll is private');
  }

  // Selection rules.
  if (!poll.allowMultiple && input.optionIds.length > 1) {
    throw AppError.badRequest('This poll only allows a single selection');
  }
  const validIds = new Set(poll.options.map((o) => o.id));
  for (const id of input.optionIds) {
    if (!validIds.has(id)) throw AppError.badRequest('Invalid option for this poll');
  }

  const ipHash = ctx.ip ? hashIp(ctx.ip) : null;
  await assertNotAlreadyVoted(poll.id, poll, ctx, ipHash);

  const device = detectDevice(ctx.userAgent);
  const browser = detectBrowser(ctx.userAgent);

  // Persist the vote rows.
  await prisma.vote.createMany({
    data: input.optionIds.map((optionId) => ({
      pollId: poll.id,
      optionId,
      userId: ctx.userId ?? null,
      ipHash,
      rating: input.rating ?? null,
      userAgent: ctx.userAgent ?? null,
      device,
      browser,
    })),
  });

  // Set dedupe guards.
  if (ctx.userId) await redis.set(keys.voteGuardUser(poll.id, ctx.userId), '1');
  else if (poll.oneVotePerIp && ipHash) await redis.set(keys.voteGuardIp(poll.id, ipHash), '1');

  // Update live counters (Redis) then persist back to Postgres.
  for (const optionId of input.optionIds) await incrementCounter(poll.id, optionId);
  await persistCounters(poll.id);

  // Compute fresh results, broadcast to watchers.
  const results = await computeResults(poll.id);
  emitPollResults(poll.id, results);

  // Notifications: notify owner of the vote + milestone crossings.
  if (poll.authorId !== ctx.userId) {
    void notifyVote(poll.authorId, poll.id, poll.title);
  }
  const total = results.totalVotes;
  if (MILESTONES.includes(total)) {
    void notifyMilestone(poll.authorId, poll.id, poll.title, total);
  }

  return {
    message: 'Vote recorded',
    results,
  };
}

/** Whether the given viewer has already voted (for UI gating). */
export async function hasVoted(pollId: string, ctx: VoteContext): Promise<{ voted: boolean; optionIds: string[] }> {
  if (ctx.userId) {
    const votes = await prisma.vote.findMany({
      where: { pollId, userId: ctx.userId },
      select: { optionId: true },
    });
    return { voted: votes.length > 0, optionIds: votes.map((v) => v.optionId) };
  }
  if (ctx.ip) {
    const ipHash = hashIp(ctx.ip);
    const votes = await prisma.vote.findMany({
      where: { pollId, ipHash, userId: null },
      select: { optionId: true },
    });
    return { voted: votes.length > 0, optionIds: votes.map((v) => v.optionId) };
  }
  return { voted: false, optionIds: [] };
}
