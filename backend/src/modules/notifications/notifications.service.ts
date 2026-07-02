import { prisma } from '../../config/prisma';
import { emitNotification } from '../../realtime/socket';
import { AppError } from '../../utils/http';
import { Prisma } from '@prisma/client';

/**
 * Create a notification row and push it to the user over WebSocket.
 * Shared internal helper used by the typed notify* functions below.
 */
async function create(
  userId: string,
  type: Prisma.NotificationCreateInput['type'],
  message: string,
  pollId?: string,
): Promise<void> {
  const notification = await prisma.notification.create({
    data: { userId, type, message, pollId: pollId ?? null },
  });
  emitNotification(userId, notification);
}

/** Notify a poll author that a new vote was cast. */
export async function notifyVote(userId: string, pollId: string, pollTitle: string): Promise<void> {
  await create(userId, 'VOTE', `New vote on "${pollTitle}"`, pollId);
}

/** Notify a poll author of a new comment. */
export async function notifyComment(
  userId: string,
  pollId: string,
  pollTitle: string,
  commenterName: string,
): Promise<void> {
  await create(userId, 'COMMENT', `${commenterName} commented on "${pollTitle}"`, pollId);
}

/** Notify a poll author that their poll hit a vote milestone. */
export async function notifyMilestone(
  userId: string,
  pollId: string,
  pollTitle: string,
  total: number,
): Promise<void> {
  await create(userId, 'MILESTONE', `"${pollTitle}" reached ${total} votes!`, pollId);
}

/** Notify a poll author that their poll has expired. */
export async function notifyExpired(userId: string, pollId: string, pollTitle: string): Promise<void> {
  await create(userId, 'EXPIRED', `Your poll "${pollTitle}" has expired`, pollId);
}

// ---- Read/query operations backing the HTTP endpoints ----

/** List a user's notifications, newest first, paginated. */
export async function listForUser(userId: string, skip: number, take: number) {
  const [items, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.notification.count({ where: { userId } }),
  ]);
  return { items, total };
}

/** Count a user's unread notifications. */
export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } });
}

/** Mark a single (own) notification read; 404 if not found or not theirs. */
export async function markRead(userId: string, id: string) {
  const existing = await prisma.notification.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) throw AppError.notFound('Notification not found');
  return prisma.notification.update({ where: { id }, data: { read: true } });
}

/** Mark all of a user's notifications read. Returns the count updated. */
export async function markAllRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  return result.count;
}

/** Delete a single (own) notification; 404 if not found or not theirs. */
export async function remove(userId: string, id: string): Promise<void> {
  const existing = await prisma.notification.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) throw AppError.notFound('Notification not found');
  await prisma.notification.delete({ where: { id } });
}
