import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/http';
import { notifyComment } from '../notifications/notifications.service';

/** Standard author projection embedded in comment responses. */
const authorSelect = { id: true, username: true, name: true, avatarUrl: true } as const;

/** Shape a Prisma comment (with author + counts) into the API response. */
function serializeComment(comment: any, currentUserId?: string | null) {
  const likes = comment.likes as { userId: string }[] | undefined;
  return {
    id: comment.id,
    pollId: comment.pollId,
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    author: comment.user
      ? {
          id: comment.user.id,
          username: comment.user.username,
          name: comment.user.name ?? null,
          avatarUrl: comment.user.avatarUrl ?? null,
        }
      : null,
    likeCount: comment._count?.likes ?? 0,
    likedByMe: currentUserId ? Boolean(likes?.some((l) => l.userId === currentUserId)) : false,
  };
}

/** Paginated comments for a poll, newest first. */
export async function listForPoll(
  pollId: string,
  opts: { skip: number; limit: number; currentUserId?: string | null },
) {
  const where = { pollId };
  const [items, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: opts.skip,
      take: opts.limit,
      include: {
        user: { select: authorSelect },
        _count: { select: { likes: true } },
        likes: opts.currentUserId ? { where: { userId: opts.currentUserId }, select: { userId: true } } : false,
      },
    }),
    prisma.comment.count({ where }),
  ]);

  return {
    items: items.map((c) => serializeComment(c, opts.currentUserId)),
    total,
  };
}

/** Add a comment to a poll and notify the poll author (fire-and-forget). */
export async function addComment(pollId: string, userId: string, content: string) {
  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll) throw AppError.notFound('Poll not found');
  if (poll.commentsDisabled) throw AppError.forbidden('Comments are disabled for this poll');

  const comment = await prisma.comment.create({
    data: { pollId, userId, content },
    include: { user: { select: authorSelect }, _count: { select: { likes: true } } },
  });

  // Notify the poll author (unless they are commenting on their own poll).
  if (poll.authorId !== userId) {
    const commenterName = comment.user?.name ?? comment.user?.username ?? 'Someone';
    void notifyComment(poll.authorId, poll.id, poll.title, commenterName);
  }

  return {
    ...serializeComment(comment, userId),
    likeCount: 0,
    likedByMe: false,
  };
}

/** Edit a comment; only the owner may do so. */
export async function editComment(commentId: string, userId: string, content: string) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw AppError.notFound('Comment not found');
  if (comment.userId !== userId) throw AppError.forbidden('You can only edit your own comments');

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { content },
    include: {
      user: { select: authorSelect },
      _count: { select: { likes: true } },
      likes: { where: { userId }, select: { userId: true } },
    },
  });
  return serializeComment(updated, userId);
}

/** Delete a comment; allowed for the comment owner or the poll owner. */
export async function deleteComment(commentId: string, userId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { poll: { select: { authorId: true } } },
  });
  if (!comment) throw AppError.notFound('Comment not found');

  const isOwner = comment.userId === userId;
  const isPollOwner = comment.poll?.authorId === userId;
  if (!isOwner && !isPollOwner) throw AppError.forbidden('You cannot delete this comment');

  await prisma.comment.delete({ where: { id: commentId } });
  return { message: 'Comment deleted' };
}

/** Like a comment (idempotent) and return the updated count. */
export async function likeComment(commentId: string, userId: string) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw AppError.notFound('Comment not found');

  await prisma.commentLike.upsert({
    where: { commentId_userId: { commentId, userId } },
    update: {},
    create: { commentId, userId },
  });
  const likeCount = await prisma.commentLike.count({ where: { commentId } });
  return { liked: true, likeCount };
}

/** Unlike a comment (idempotent) and return the updated count. */
export async function unlikeComment(commentId: string, userId: string) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw AppError.notFound('Comment not found');

  await prisma.commentLike.deleteMany({ where: { commentId, userId } });
  const likeCount = await prisma.commentLike.count({ where: { commentId } });
  return { liked: false, likeCount };
}
