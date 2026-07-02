import { PrismaClient, PollType, Visibility, Role, NotificationType } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** Lowercase, strip non-alphanumerics to '-', collapse repeats, trim edges. */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/** Short random alphanumeric suffix to keep slugs unique. */
function shortId(): string {
  return faker.string.alphanumeric(6).toLowerCase();
}

/** Fake sha-256-ish hex hash (for IP hashing). */
function ipHash(): string {
  return faker.string.hexadecimal({ length: 64, casing: 'lower', prefix: '' });
}

function pickDevice(): string {
  // weighted desktop > mobile > tablet
  return faker.helpers.weightedArrayElement([
    { weight: 6, value: 'desktop' },
    { weight: 3, value: 'mobile' },
    { weight: 1, value: 'tablet' },
  ]);
}

function pickBrowser(): string {
  return faker.helpers.arrayElement(['Chrome', 'Safari', 'Firefox', 'Edge']);
}

const CATEGORIES: { name: string; icon: string; color: string }[] = [
  { name: 'Technology', icon: '💻', color: '#3b82f6' },
  { name: 'Gaming', icon: '🎮', color: '#8b5cf6' },
  { name: 'Sports', icon: '⚽', color: '#22c55e' },
  { name: 'Movies', icon: '🎬', color: '#ef4444' },
  { name: 'Education', icon: '📚', color: '#f59e0b' },
  { name: 'Business', icon: '💼', color: '#0ea5e9' },
  { name: 'Entertainment', icon: '🎭', color: '#ec4899' },
  { name: 'Politics', icon: '🏛️', color: '#64748b' },
  { name: 'Food', icon: '🍔', color: '#f97316' },
  { name: 'Travel', icon: '✈️', color: '#14b8a6' },
];

const FIXED_TAGS = ['ai', 'web3', 'opinion', 'fun', '2024'];

export async function runSeed(): Promise<void> {
  console.log('🌱 PollWave seed starting...');

  // ---- 1. Clean existing data (FK-safe order) ----
  console.log('🧹 Clearing existing data...');
  await prisma.notification.deleteMany();
  await prisma.commentLike.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.pollView.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.pollTag.deleteMany();
  await prisma.pollOption.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // ---- 2. Categories ----
  console.log('📂 Creating categories...');
  await prisma.category.createMany({
    data: CATEGORIES.map((c) => ({
      name: c.name,
      slug: slugify(c.name),
      icon: c.icon,
      color: c.color,
    })),
  });
  const categories = await prisma.category.findMany();

  // ---- 3. Tags (~25 unique) ----
  console.log('🏷️  Creating tags...');
  const tagNameSet = new Set<string>(FIXED_TAGS);
  while (tagNameSet.size < 25) {
    tagNameSet.add(faker.word.noun().toLowerCase());
  }
  const tagNames = Array.from(tagNameSet);
  await prisma.tag.createMany({
    data: tagNames.map((name) => ({ name, slug: slugify(name) })),
    skipDuplicates: true,
  });
  const tags = await prisma.tag.findMany();

  // ---- 4. Users ----
  console.log('👤 Creating admin + demo users...');
  const adminHash = await bcrypt.hash('Admin123!', 10);
  const userHash = await bcrypt.hash('Password123!', 10);

  await prisma.user.create({
    data: {
      email: 'admin@pollwave.dev',
      username: 'admin',
      passwordHash: adminHash,
      name: 'Admin',
      role: Role.ADMIN,
      bio: 'Platform administrator.',
      avatarUrl: faker.image.avatar(),
    },
  });

  const demoUsersData = Array.from({ length: 20 }, (_, i) => {
    const n = i + 1;
    return {
      email: `user${n}@pollwave.dev`,
      username: `user${n}`,
      passwordHash: userHash,
      name: faker.person.fullName(),
      bio: faker.person.bio(),
      avatarUrl: faker.image.avatar(),
      role: Role.USER,
    };
  });
  await prisma.user.createMany({ data: demoUsersData });

  const users = await prisma.user.findMany();
  const userIds = users.map((u) => u.id);

  // ---- 5. Polls + options + poll tags ----
  console.log('🗳️  Creating polls, options and tags...');
  const now = new Date();
  const sixtyDaysAgo = faker.date.recent({ days: 60 });

  const pollTypeWeighted = [
    { weight: 8, value: PollType.SINGLE_CHOICE },
    { weight: 6, value: PollType.MULTIPLE_CHOICE },
    { weight: 3, value: PollType.YES_NO },
    { weight: 2, value: PollType.RATING },
    { weight: 2, value: PollType.EMOJI },
    { weight: 1, value: PollType.IMAGE_CHOICE },
  ];
  const visibilityWeighted = [
    { weight: 8, value: Visibility.PUBLIC },
    { weight: 1, value: Visibility.PRIVATE },
    { weight: 1, value: Visibility.UNLISTED },
  ];

  type BuiltPoll = {
    id: string;
    type: PollType;
    createdAt: Date;
    expiresAt: Date | null;
    commentsDisabled: boolean;
    optionIds: string[];
  };
  const builtPolls: BuiltPoll[] = [];

  const usedSlugs = new Set<string>();

  for (let i = 0; i < 100; i++) {
    const type = faker.helpers.weightedArrayElement(pollTypeWeighted);
    const visibility = faker.helpers.weightedArrayElement(visibilityWeighted);
    const author = faker.helpers.arrayElement(users);
    const category = faker.helpers.maybe(() => faker.helpers.arrayElement(categories), {
      probability: 0.9,
    });

    const createdAt = faker.date.between({ from: sixtyDaysAgo, to: now });

    // expiry: some polls have an expiry (future or past). Past expiry => closed.
    let expiresAt: Date | null = null;
    let closedAt: Date | null = null;
    if (faker.datatype.boolean({ probability: 0.5 })) {
      if (faker.datatype.boolean()) {
        expiresAt = faker.date.soon({ days: 30, refDate: now });
      } else {
        expiresAt = faker.date.between({ from: createdAt, to: now });
        closedAt = expiresAt;
      }
    }

    const title = faker.helpers.arrayElement([
      `What is the best ${faker.word.noun()}?`,
      `Which ${faker.word.noun()} do you prefer?`,
      `How do you feel about ${faker.word.noun()}?`,
      `Rate the new ${faker.word.noun()}`,
      `${faker.company.catchPhrase()}?`,
      `Should we ${faker.word.verb()} the ${faker.word.noun()}?`,
    ]);

    let slug = `${slugify(title)}-${shortId()}`;
    while (usedSlugs.has(slug)) {
      slug = `${slugify(title)}-${shortId()}`;
    }
    usedSlugs.add(slug);

    const commentsDisabled = faker.datatype.boolean({ probability: 0.15 });

    const poll = await prisma.poll.create({
      data: {
        slug,
        title,
        description: faker.helpers.maybe(() => faker.lorem.paragraph(), { probability: 0.7 }),
        coverImage: faker.helpers.maybe(() => faker.image.url(), { probability: 0.4 }),
        type,
        visibility,
        allowMultiple: type === PollType.MULTIPLE_CHOICE,
        oneVotePerIp: faker.datatype.boolean({ probability: 0.3 }),
        requireLogin: faker.datatype.boolean({ probability: 0.2 }),
        commentsDisabled,
        isArchived: faker.datatype.boolean({ probability: 0.1 }),
        isPinned: faker.datatype.boolean({ probability: 0.1 }),
        closedAt,
        expiresAt,
        viewCount: 0,
        voteCount: 0,
        authorId: author.id,
        categoryId: category ? category.id : null,
        createdAt,
        updatedAt: createdAt,
      },
    });

    // Build option texts based on type.
    let optionTexts: string[];
    if (type === PollType.YES_NO) {
      optionTexts = ['Yes', 'No'];
    } else if (type === PollType.RATING) {
      optionTexts = ['1', '2', '3', '4', '5'];
    } else if (type === PollType.EMOJI) {
      optionTexts = ['😍', '😀', '😐', '😞', '😡'];
    } else {
      const count = faker.number.int({ min: 3, max: 6 });
      optionTexts = faker.helpers.uniqueArray(() => faker.commerce.productName(), count);
      // uniqueArray may return fewer than requested; pad if needed.
      while (optionTexts.length < 3) {
        optionTexts.push(faker.word.words(2));
      }
    }

    const optionsData = optionTexts.map((text, order) => ({
      pollId: poll.id,
      text,
      order,
      voteCount: 0,
      imageUrl: type === PollType.IMAGE_CHOICE ? faker.image.url() : null,
    }));
    await prisma.pollOption.createMany({ data: optionsData });
    const options = await prisma.pollOption.findMany({
      where: { pollId: poll.id },
      select: { id: true },
    });

    // Attach 1-4 random tags.
    const tagCount = faker.number.int({ min: 1, max: 4 });
    const pollTags = faker.helpers.arrayElements(tags, tagCount);
    if (pollTags.length > 0) {
      await prisma.pollTag.createMany({
        data: pollTags.map((t) => ({ pollId: poll.id, tagId: t.id })),
        skipDuplicates: true,
      });
    }

    builtPolls.push({
      id: poll.id,
      type,
      createdAt,
      expiresAt,
      commentsDisabled,
      optionIds: options.map((o) => o.id),
    });
  }

  // ---- 6. Votes (5000, batched) ----
  console.log('✅ Creating votes...');
  const TOTAL_VOTES = 5000;
  const voteBatch: {
    pollId: string;
    optionId: string;
    userId: string | null;
    ipHash: string | null;
    rating: number | null;
    userAgent: string | null;
    device: string;
    browser: string;
    createdAt: Date;
  }[] = [];

  // running tallies for consistency recompute
  const optionVoteCount = new Map<string, number>();
  const pollVoteCount = new Map<string, number>();

  for (let i = 0; i < TOTAL_VOTES; i++) {
    const poll = faker.helpers.arrayElement(builtPolls);
    if (poll.optionIds.length === 0) continue;
    const optionId = faker.helpers.arrayElement(poll.optionIds);
    const anonymous = faker.datatype.boolean({ probability: 0.4 });
    const userId = anonymous ? null : faker.helpers.arrayElement(userIds);
    const voteCreatedAt = faker.date.between({ from: poll.createdAt, to: now });

    voteBatch.push({
      pollId: poll.id,
      optionId,
      userId,
      ipHash: ipHash(),
      rating: poll.type === PollType.RATING ? faker.number.int({ min: 1, max: 5 }) : null,
      userAgent: faker.internet.userAgent(),
      device: pickDevice(),
      browser: pickBrowser(),
      createdAt: voteCreatedAt,
    });

    optionVoteCount.set(optionId, (optionVoteCount.get(optionId) ?? 0) + 1);
    pollVoteCount.set(poll.id, (pollVoteCount.get(poll.id) ?? 0) + 1);
  }

  const BATCH = 1000;
  for (let i = 0; i < voteBatch.length; i += BATCH) {
    await prisma.vote.createMany({ data: voteBatch.slice(i, i + BATCH) });
  }

  // Recompute option + poll vote counts from actual grouped counts.
  console.log('🔢 Recomputing vote counts...');
  const optionGroups = await prisma.vote.groupBy({
    by: ['optionId'],
    _count: { _all: true },
  });
  for (let i = 0; i < optionGroups.length; i += 50) {
    const chunk = optionGroups.slice(i, i + 50);
    await Promise.all(
      chunk.map((g) =>
        prisma.pollOption.update({
          where: { id: g.optionId },
          data: { voteCount: g._count._all },
        }),
      ),
    );
  }

  const pollGroups = await prisma.vote.groupBy({
    by: ['pollId'],
    _count: { _all: true },
  });
  for (let i = 0; i < pollGroups.length; i += 50) {
    const chunk = pollGroups.slice(i, i + 50);
    await Promise.all(
      chunk.map((g) =>
        prisma.poll.update({
          where: { id: g.pollId },
          data: { voteCount: g._count._all },
        }),
      ),
    );
  }

  // ---- 7. Comments (~300, skip commentsDisabled) ----
  console.log('💬 Creating comments...');
  const commentablePolls = builtPolls.filter((p) => !p.commentsDisabled);
  const commentsData: { pollId: string; userId: string; content: string; createdAt: Date }[] = [];
  if (commentablePolls.length > 0) {
    for (let i = 0; i < 300; i++) {
      const poll = faker.helpers.arrayElement(commentablePolls);
      commentsData.push({
        pollId: poll.id,
        userId: faker.helpers.arrayElement(userIds),
        content: faker.lorem.sentences({ min: 1, max: 3 }),
        createdAt: faker.date.between({ from: poll.createdAt, to: now }),
      });
    }
    await prisma.comment.createMany({ data: commentsData });
  }
  const comments = await prisma.comment.findMany({ select: { id: true } });
  const commentIds = comments.map((c) => c.id);

  // ---- 8. Comment likes (~400, dedupe on [commentId, userId]) ----
  console.log('❤️  Creating comment likes...');
  if (commentIds.length > 0) {
    const likeKeys = new Set<string>();
    const likesData: { commentId: string; userId: string }[] = [];
    let attempts = 0;
    while (likesData.length < 400 && attempts < 4000) {
      attempts++;
      const commentId = faker.helpers.arrayElement(commentIds);
      const userId = faker.helpers.arrayElement(userIds);
      const key = `${commentId}:${userId}`;
      if (likeKeys.has(key)) continue;
      likeKeys.add(key);
      likesData.push({ commentId, userId });
    }
    await prisma.commentLike.createMany({ data: likesData, skipDuplicates: true });
  }

  // ---- 9. Favorites (~300, dedupe on [pollId, userId]) ----
  console.log('⭐ Creating favorites...');
  const favKeys = new Set<string>();
  const favData: { pollId: string; userId: string }[] = [];
  let favAttempts = 0;
  while (favData.length < 300 && favAttempts < 4000) {
    favAttempts++;
    const poll = faker.helpers.arrayElement(builtPolls);
    const userId = faker.helpers.arrayElement(userIds);
    const key = `${poll.id}:${userId}`;
    if (favKeys.has(key)) continue;
    favKeys.add(key);
    favData.push({ pollId: poll.id, userId });
  }
  await prisma.favorite.createMany({ data: favData, skipDuplicates: true });

  // ---- 10. Follows (~100, no self, dedupe on [followerId, followingId]) ----
  console.log('🔗 Creating follows...');
  const followKeys = new Set<string>();
  const followData: { followerId: string; followingId: string }[] = [];
  let followAttempts = 0;
  while (followData.length < 100 && followAttempts < 4000) {
    followAttempts++;
    const followerId = faker.helpers.arrayElement(userIds);
    const followingId = faker.helpers.arrayElement(userIds);
    if (followerId === followingId) continue;
    const key = `${followerId}:${followingId}`;
    if (followKeys.has(key)) continue;
    followKeys.add(key);
    followData.push({ followerId, followingId });
  }
  await prisma.follow.createMany({ data: followData, skipDuplicates: true });

  // ---- 11. Notifications (~150, varied types) ----
  console.log('🔔 Creating notifications...');
  const notifTypes = Object.values(NotificationType);
  const notifData: {
    userId: string;
    type: NotificationType;
    message: string;
    pollId: string | null;
    read: boolean;
    createdAt: Date;
  }[] = [];
  for (let i = 0; i < 150; i++) {
    const type = faker.helpers.arrayElement(notifTypes);
    const poll = faker.helpers.arrayElement(builtPolls);
    let message: string;
    let pollId: string | null = poll.id;
    switch (type) {
      case NotificationType.VOTE:
        message = 'Someone voted on your poll.';
        break;
      case NotificationType.COMMENT:
        message = 'A new comment was posted on your poll.';
        break;
      case NotificationType.EXPIRED:
        message = 'Your poll has expired.';
        break;
      case NotificationType.MILESTONE:
        message = `Your poll reached ${faker.number.int({ min: 100, max: 1000 })} votes!`;
        break;
      case NotificationType.FOLLOW:
        message = `${faker.person.firstName()} started following you.`;
        pollId = null;
        break;
      default:
        message = 'You have a new notification.';
    }
    notifData.push({
      userId: faker.helpers.arrayElement(userIds),
      type,
      message,
      pollId,
      read: faker.datatype.boolean({ probability: 0.5 }),
      createdAt: faker.date.recent({ days: 30 }),
    });
  }
  await prisma.notification.createMany({ data: notifData });

  // ---- 12. Poll views (~2000, batched) then set viewCount ----
  console.log('👁️  Creating poll views...');
  const viewData: {
    pollId: string;
    userId: string | null;
    ipHash: string | null;
    device: string;
    createdAt: Date;
  }[] = [];
  const pollViewCount = new Map<string, number>();
  for (let i = 0; i < 2000; i++) {
    const poll = faker.helpers.arrayElement(builtPolls);
    const anonymous = faker.datatype.boolean({ probability: 0.5 });
    viewData.push({
      pollId: poll.id,
      userId: anonymous ? null : faker.helpers.arrayElement(userIds),
      ipHash: ipHash(),
      device: pickDevice(),
      createdAt: faker.date.between({ from: poll.createdAt, to: now }),
    });
    pollViewCount.set(poll.id, (pollViewCount.get(poll.id) ?? 0) + 1);
  }
  for (let i = 0; i < viewData.length; i += BATCH) {
    await prisma.pollView.createMany({ data: viewData.slice(i, i + BATCH) });
  }

  const viewGroups = await prisma.pollView.groupBy({
    by: ['pollId'],
    _count: { _all: true },
  });
  for (let i = 0; i < viewGroups.length; i += 50) {
    const chunk = viewGroups.slice(i, i + 50);
    await Promise.all(
      chunk.map((g) =>
        prisma.poll.update({
          where: { id: g.pollId },
          data: { viewCount: g._count._all },
        }),
      ),
    );
  }

  // ---- Summary ----
  const [
    userCount,
    categoryCount,
    tagCount,
    pollCount,
    optionCount,
    voteCount,
    commentCount,
    likeCount,
    favoriteCount,
    followCount,
    notificationCount,
    viewCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.category.count(),
    prisma.tag.count(),
    prisma.poll.count(),
    prisma.pollOption.count(),
    prisma.vote.count(),
    prisma.comment.count(),
    prisma.commentLike.count(),
    prisma.favorite.count(),
    prisma.follow.count(),
    prisma.notification.count(),
    prisma.pollView.count(),
  ]);

  console.log(
    `🎉 Seed complete — users:${userCount} categories:${categoryCount} tags:${tagCount} ` +
      `polls:${pollCount} options:${optionCount} votes:${voteCount} comments:${commentCount} ` +
      `commentLikes:${likeCount} favorites:${favoriteCount} follows:${followCount} ` +
      `notifications:${notificationCount} pollViews:${viewCount}`,
  );
}

// Run when invoked directly (tsx prisma/seed.ts / node dist/prisma/seed.js)
if (require.main === module) {
  runSeed()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
