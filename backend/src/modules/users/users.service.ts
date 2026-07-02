import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/http';
import { serializePoll, pollInclude } from '../polls/poll.serializer';
import { UpdateProfileInput } from './users.schema';

/** Shape a user into the public profile fields exposed by the API. */
function publicProfile(user: any) {
  return {
    id: user.id,
    username: user.username,
    name: user.name ?? null,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
    createdAt: user.createdAt,
  };
}

/** Load a user by username or throw 404. */
async function findByUsername(username: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw AppError.notFound('User not found');
  return user;
}

/** Public profile with aggregate counts and (optional) follow status. */
export async function getProfile(username: string, currentUserId?: string | null) {
  const user = await findByUsername(username);

  const [polls, votes, followers, following, follow] = await Promise.all([
    prisma.poll.count({ where: { authorId: user.id, visibility: 'PUBLIC', isArchived: false } }),
    prisma.vote.count({ where: { userId: user.id } }),
    prisma.follow.count({ where: { followingId: user.id } }),
    prisma.follow.count({ where: { followerId: user.id } }),
    currentUserId
      ? prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: currentUserId, followingId: user.id } },
        })
      : Promise.resolve(null),
  ]);

  return {
    ...publicProfile(user),
    counts: { polls, votes, followers, following },
    isFollowing: Boolean(follow),
  };
}

/** Paginated public, non-archived polls authored by a user. */
export async function getUserPolls(
  username: string,
  opts: { skip: number; limit: number; currentUserId?: string | null },
) {
  const user = await findByUsername(username);
  const where = { authorId: user.id, visibility: 'PUBLIC' as const, isArchived: false };

  const [items, total] = await Promise.all([
    prisma.poll.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: opts.skip,
      take: opts.limit,
      include: pollInclude,
    }),
    prisma.poll.count({ where }),
  ]);

  return {
    items: items.map((p) => serializePoll(p, { currentUserId: opts.currentUserId })),
    total,
  };
}

/** Update the current user's own profile, enforcing username uniqueness. */
export async function updateProfile(userId: string, input: UpdateProfileInput) {
  if (input.username) {
    const existing = await prisma.user.findUnique({ where: { username: input.username } });
    if (existing && existing.id !== userId) throw AppError.conflict('Username already taken');
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      bio: input.bio,
      avatarUrl: input.avatarUrl,
      username: input.username,
    },
  });
  return publicProfile(user);
}

/** Follow another user (idempotent). Cannot follow yourself. */
export async function followUser(currentUserId: string, username: string) {
  const target = await findByUsername(username);
  if (target.id === currentUserId) throw AppError.badRequest('You cannot follow yourself');

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: currentUserId, followingId: target.id } },
    update: {},
    create: { followerId: currentUserId, followingId: target.id },
  });
  return { following: true };
}

/** Unfollow another user (idempotent). */
export async function unfollowUser(currentUserId: string, username: string) {
  const target = await findByUsername(username);
  await prisma.follow.deleteMany({
    where: { followerId: currentUserId, followingId: target.id },
  });
  return { following: false };
}
