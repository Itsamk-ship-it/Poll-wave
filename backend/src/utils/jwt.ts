import jwt, { SignOptions } from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { env } from '../config/env';

export interface AccessPayload {
  sub: string; // user id
  role: string;
  jti: string;
}

export interface RefreshPayload {
  sub: string;
  jti: string;
}

export function signAccessToken(userId: string, role: string): { token: string; jti: string } {
  const jti = nanoid();
  const token = jwt.sign({ sub: userId, role, jti }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpires,
  } as SignOptions);
  return { token, jti };
}

export function signRefreshToken(userId: string): { token: string; jti: string } {
  const jti = nanoid();
  const token = jwt.sign({ sub: userId, jti }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpires,
  } as SignOptions);
  return { token, jti };
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessPayload;
}

export function verifyRefreshToken(token: string): RefreshPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as RefreshPayload;
}
