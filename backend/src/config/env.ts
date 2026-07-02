import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load the single root .env (one level above the backend package) for local
// dev. Under Docker the file is absent and env vars are supplied by compose —
// dotenv never overrides variables already present in process.env, so this is
// safe in every run mode.
const rootEnv = path.resolve(process.cwd(), '../.env');
dotenv.config(fs.existsSync(rootEnv) ? { path: rootEnv } : {});

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT ?? '4000', 10),
  databaseUrl: required('DATABASE_URL', 'postgresql://pollwave:pollwave@localhost:5432/pollwave?schema=public'),
  redisUrl: required('REDIS_URL', 'redis://localhost:6379'),
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev_access_secret_change_me'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  },
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim()),
  seedOnStart: process.env.SEED_ON_START === 'true',
};
