import Redis from 'ioredis';
import { env } from './env';

// Primary connection used for commands + caching.
export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: false,
});

// Separate pub/sub connections for Socket.IO adapter / fan-out if needed.
export const redisPub = new Redis(env.redisUrl, { maxRetriesPerRequest: null });
export const redisSub = new Redis(env.redisUrl, { maxRetriesPerRequest: null });

redis.on('error', (err) => console.error('[redis] error', err.message));
redis.on('connect', () => console.log('[redis] connected'));

export async function disconnectRedis(): Promise<void> {
  await Promise.allSettled([redis.quit(), redisPub.quit(), redisSub.quit()]);
}

/**
 * Central Redis key registry — keeps cache keys consistent across the app.
 */
export const keys = {
  // Live vote counters (hash: optionId -> count) per poll
  pollVotes: (pollId: string) => `poll:${pollId}:votes`,
  pollVoteTotal: (pollId: string) => `poll:${pollId}:votes:total`,
  // Cached, fully-computed poll results payload
  pollResults: (pollId: string) => `poll:${pollId}:results`,
  // Poll views counter
  pollViews: (pollId: string) => `poll:${pollId}:views`,
  // Trending / popular polls sorted set (score = weighted popularity)
  trending: 'polls:trending',
  // Dashboard stats cache per user
  dashboard: (userId: string) => `dashboard:${userId}`,
  // Search results cache
  search: (hash: string) => `search:${hash}`,
  // Refresh token whitelist (session storage): token id -> userId
  refreshToken: (jti: string) => `refresh:${jti}`,
  // Access token blacklist (logout / revocation)
  blacklist: (jti: string) => `blacklist:${jti}`,
  // Rate limit prefix handled by rate-limit-redis
  // Idempotent vote guard (one vote per user/ip per poll)
  voteGuardUser: (pollId: string, userId: string) => `vote:${pollId}:u:${userId}`,
  voteGuardIp: (pollId: string, ipHash: string) => `vote:${pollId}:ip:${ipHash}`,
};

const DEFAULT_TTL = 60; // seconds

/** Get a JSON value from cache, or null. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

/** Store a JSON value with a TTL (seconds). */
export async function cacheSet<T>(key: string, value: T, ttl = DEFAULT_TTL): Promise<void> {
  await redis.set(key, JSON.stringify(value), 'EX', ttl);
}

/** Delete one or more cache keys. */
export async function cacheDel(...keyList: string[]): Promise<void> {
  if (keyList.length) await redis.del(...keyList);
}

/**
 * Cache-aside helper: return cached value or compute, store, and return it.
 */
export async function cacheWrap<T>(
  key: string,
  ttl: number,
  producer: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const fresh = await producer();
  await cacheSet(key, fresh, ttl);
  return fresh;
}
