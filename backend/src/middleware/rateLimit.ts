import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../config/redis';

function makeStore(prefix: string) {
  return new RedisStore({
    prefix: `rl:${prefix}:`,
    // ioredis is compatible with node-redis call signature used by the store
    sendCommand: (...args: string[]) => redis.call(...(args as [string, ...string[]])) as Promise<any>,
  });
}

/** Generous limiter for general API traffic. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('api'),
  message: { success: false, error: { message: 'Too many requests, slow down.' } },
});

/** Strict limiter for auth endpoints to blunt brute-force attempts. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('auth'),
  message: { success: false, error: { message: 'Too many auth attempts, try again later.' } },
});

/** Moderate limiter for voting to prevent flooding. */
export const voteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('vote'),
  message: { success: false, error: { message: 'Voting too fast, slow down.' } },
});
