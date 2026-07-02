import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/http';
import { computeResults, voteTimeline } from '../polls/results.service';

/** Owner-only analytics for a single poll. */
export async function getPollAnalytics(pollId: string, userId: string) {
  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll) throw AppError.notFound('Poll not found');
  if (poll.authorId !== userId) throw AppError.forbidden('You do not own this poll');

  const totalViews = poll.viewCount;
  const totalVotes = poll.voteCount;
  const conversionRate = totalViews > 0 ? Math.round((totalVotes / totalViews) * 1000) / 10 : 0;

  // Pull vote metadata once and aggregate in JS.
  const votes = await prisma.vote.findMany({
    where: { pollId },
    select: { createdAt: true, device: true, browser: true },
  });

  // Votes per hour of day (0-23).
  const hourly = new Array(24).fill(0) as number[];
  const deviceBreakdown = { desktop: 0, mobile: 0, tablet: 0 };
  const browserBreakdown: Record<string, number> = {};

  for (const v of votes) {
    hourly[v.createdAt.getHours()] += 1;

    if (v.device === 'desktop' || v.device === 'mobile' || v.device === 'tablet') {
      deviceBreakdown[v.device] += 1;
    }
    if (v.browser) {
      browserBreakdown[v.browser] = (browserBreakdown[v.browser] ?? 0) + 1;
    }
  }

  const topVotingTimes = hourly.map((count, hour) => ({ hour, votes: count }));
  const dailyActivity = await voteTimeline(pollId, 14);
  const results = await computeResults(pollId);

  return {
    totalViews,
    totalVotes,
    conversionRate,
    dailyActivity,
    topVotingTimes,
    deviceBreakdown,
    browserBreakdown,
    options: results.options,
  };
}
