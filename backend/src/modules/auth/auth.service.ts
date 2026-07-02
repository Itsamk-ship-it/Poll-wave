import { prisma } from '../../config/prisma';
import { redis, keys } from '../../config/redis';
import { env } from '../../config/env';
import { AppError } from '../../utils/http';
import { hashPassword, verifyPassword } from '../../utils/crypto';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt';
import { toSeconds } from '../../utils/duration';
import { RegisterInput, LoginInput } from './auth.schema';

const REFRESH_TTL = toSeconds(env.jwt.refreshExpires);
const ACCESS_TTL = toSeconds(env.jwt.accessExpires);

export function publicUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    role: user.role,
    createdAt: user.createdAt,
  };
}

async function issueTokens(userId: string, role: string) {
  const access = signAccessToken(userId, role);
  const refresh = signRefreshToken(userId);
  // Whitelist the refresh token id (session storage in Redis).
  await redis.set(keys.refreshToken(refresh.jti), userId, 'EX', REFRESH_TTL);
  return { accessToken: access.token, refreshToken: refresh.token };
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
  });
  if (existing) {
    throw AppError.conflict(
      existing.email === input.email ? 'Email already in use' : 'Username already taken',
    );
  }

  const user = await prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
      passwordHash: await hashPassword(input.password),
      name: input.name ?? input.username,
    },
  });

  const tokens = await issueTokens(user.id, user.role);
  return { user: publicUser(user), ...tokens };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: input.emailOrUsername }, { username: input.emailOrUsername }],
    },
  });
  if (!user) throw AppError.unauthorized('Invalid credentials');

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw AppError.unauthorized('Invalid credentials');

  const tokens = await issueTokens(user.id, user.role);
  return { user: publicUser(user), ...tokens };
}

export async function refresh(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw AppError.unauthorized('Invalid refresh token');
  }

  const stored = await redis.get(keys.refreshToken(payload.jti));
  if (!stored || stored !== payload.sub) {
    throw AppError.unauthorized('Refresh token expired or revoked');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw AppError.unauthorized('User no longer exists');

  // Rotate: invalidate the old refresh token and issue a fresh pair.
  await redis.del(keys.refreshToken(payload.jti));
  const tokens = await issueTokens(user.id, user.role);
  return { user: publicUser(user), ...tokens };
}

export async function logout(accessJti: string, refreshToken?: string) {
  // Blacklist the current access token until it would naturally expire.
  await redis.set(keys.blacklist(accessJti), '1', 'EX', ACCESS_TTL);
  // Revoke the refresh token session if provided.
  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await redis.del(keys.refreshToken(payload.jti));
    } catch {
      /* ignore malformed refresh token on logout */
    }
  }
}

export async function changePassword(userId: string, current: string, next: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound('User not found');
  const valid = await verifyPassword(current, user.passwordHash);
  if (!valid) throw AppError.badRequest('Current password is incorrect');
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(next) },
  });
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound('User not found');
  return publicUser(user);
}
