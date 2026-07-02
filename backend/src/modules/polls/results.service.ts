import { prisma } from '../../config/prisma';
import { redis, keys, cacheGet, cacheSet, cacheDel } from '../../config/redis';

export interface OptionResult {
  optionId: string;
  text: string;
  imageUrl: string | null;
  order: number;
  votes: number;
  percentage: number;
}

export interface PollResults {
  pollId: string;
  totalVotes: number;
  options: OptionResult[];
  updatedAt: string;
}

const RESULTS_TTL = 30; // seconds

/**
 * Rebuild the live counters in Redis from the source-of-truth in Postgres.
 * Used on cold cache and after mutations that change the option set.
 */
export async function hydrateCounters(pollId: string): Promise<void> {
  const options = await prisma.pollOption.findMany({
    where: { pollId },
    select: { id: true, voteCount: true },
  });
  const votesKey = keys.pollVotes(pollId);
  const pipeline = redis.multi();
  pipeline.del(votesKey);
  let total = 0;
  for (const o of options) {
    if (o.voteCount > 0) pipeline.hset(votesKey, o.id, o.voteCount);
    total += o.voteCount;
  }
  pipeline.set(keys.pollVoteTotal(pollId), total);
  await pipeline.exec();
}

/** Atomically increment the live counter for an option (Redis). */
export async function incrementCounter(pollId: string, optionId: string): Promise<void> {
  await redis
    .multi()
    .hincrby(keys.pollVotes(pollId), optionId, 1)
    .incr(keys.pollVoteTotal(pollId))
    .exec();
  // Bump popularity in the trending sorted set.
  await redis.zincrby(keys.trending, 1, pollId);
  // Invalidate the computed results cache so the next read recomputes.
  await cacheDel(keys.pollResults(pollId));
}

/** Read live counts from Redis, hydrating from Postgres on a cold cache. */
async function readCounters(pollId: string): Promise<Record<string, number>> {
  const votesKey = keys.pollVotes(pollId);
  const exists = await redis.exists(votesKey);
  if (!exists) {
    // Might genuinely be zero votes, or a cold cache — hydrate to be safe.
    await hydrateCounters(pollId);
  }
  const raw = await redis.hgetall(votesKey);
  const counts: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) counts[k] = parseInt(v, 10) || 0;
  return counts;
}

/**
 * Compute the full results payload (cached in Redis, cache-aside).
 */
export async function computeResults(pollId: string): Promise<PollResults> {
  const cacheKey = keys.pollResults(pollId);
  const cached = await cacheGet<PollResults>(cacheKey);
  if (cached) return cached;

  const options = await prisma.pollOption.findMany({
    where: { pollId },
    orderBy: { order: 'asc' },
    select: { id: true, text: true, imageUrl: true, order: true },
  });

  const counts = await readCounters(pollId);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const results: PollResults = {
    pollId,
    totalVotes: total,
    options: options.map((o) => {
      const votes = counts[o.id] ?? 0;
      return {
        optionId: o.id,
        text: o.text,
        imageUrl: o.imageUrl,
        order: o.order,
        votes,
        percentage: total > 0 ? Math.round((votes / total) * 1000) / 10 : 0,
      };
    }),
    updatedAt: new Date().toISOString(),
  };

  await cacheSet(cacheKey, results, RESULTS_TTL);
  return results;
}

/**
 * Persist the Redis counters back to Postgres (durability).
 * Called after each vote in the vote service.
 */
export async function persistCounters(pollId: string): Promise<void> {
  const counts = await readCounters(pollId);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const ops = Object.entries(counts).map(([optionId, votes]) =>
    prisma.pollOption.update({ where: { id: optionId }, data: { voteCount: votes } }),
  );
  ops.push(prisma.poll.update({ where: { id: pollId }, data: { voteCount: total } }) as any);
  await prisma.$transaction(ops as any);
}

/** Vote-timeline buckets for charts (last `days` days). */
export async function voteTimeline(pollId: string, days = 14): Promise<{ date: string; votes: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const votes = await prisma.vote.findMany({
    where: { pollId, createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const v of votes) {
    const key = v.createdAt.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([date, count]) => ({ date, votes: count }));
}
