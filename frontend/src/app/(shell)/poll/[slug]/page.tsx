'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  CalendarDays,
  Compass,
  Eye,
  Heart,
  MessageSquare,
  Pencil,
  Share2,
  LineChart,
} from 'lucide-react';
import { toast } from 'sonner';
import { favoritesApi, pollsApi, votesApi } from '@/lib/services';
import { getErrorMessage } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { usePollLive } from '@/hooks/use-poll-live';
import { cn, formatNumber, POLL_TYPE_LABELS, timeAgo } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VoteBox } from '@/components/poll/vote-box';
import { ResultsCharts } from '@/components/poll/results-charts';
import { CommentSection } from '@/components/poll/comment-section';
import { ShareDialog } from '@/components/poll/share-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { PageLoading } from '@/components/common/loading';

export default function PollDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const qc = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  const {
    data: poll,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['poll', slug],
    queryFn: () => pollsApi.get(slug),
    enabled: !!slug,
  });

  const pollId = poll?.id ?? '';

  const { results, setResults } = usePollLive(pollId, slug);

  const { data: voteStatus } = useQuery({
    queryKey: ['vote-status', pollId],
    queryFn: () => votesApi.status(pollId),
    enabled: !!pollId,
  });

  const [localVoted, setLocalVoted] = React.useState(false);
  const [localVotedIds, setLocalVotedIds] = React.useState<string[]>([]);

  const voteMutation = useMutation({
    mutationFn: (vars: { optionIds: string[]; rating?: number }) =>
      votesApi.cast({ pollId, optionIds: vars.optionIds, rating: vars.rating }),
    onSuccess: (data, vars) => {
      setResults(data.results);
      setLocalVoted(true);
      setLocalVotedIds(vars.optionIds);
      toast.success(data.message || 'Vote submitted!');
      qc.invalidateQueries({ queryKey: ['vote-status', pollId] });
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not submit your vote')),
  });

  // Favorites
  const { data: favStatus } = useQuery({
    queryKey: ['favorite-status', pollId],
    queryFn: () => favoritesApi.status(pollId),
    enabled: !!pollId && isAuthenticated,
  });

  const favorited = favStatus?.favorited ?? poll?.isFavorited ?? false;

  const favMutation = useMutation({
    mutationFn: (next: boolean) =>
      next ? favoritesApi.add(pollId) : favoritesApi.remove(pollId),
    onSuccess: (_data, next) => {
      qc.setQueryData(['favorite-status', pollId], { favorited: next });
      qc.invalidateQueries({ queryKey: ['favorite-status', pollId] });
      toast.success(next ? 'Added to favorites' : 'Removed from favorites');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not update favorite')),
  });

  const toggleFavorite = () => {
    if (!isAuthenticated) {
      toast.error('Log in to save polls');
      return;
    }
    favMutation.mutate(!favorited);
  };

  if (isLoading) return <PageLoading label="Loading poll…" />;

  if (isError || !poll) {
    return (
      <EmptyState
        icon={<Compass />}
        title="Poll not found"
        description="This poll may have been removed or the link is incorrect."
        action={
          <Button asChild>
            <Link href="/explore">Explore polls</Link>
          </Button>
        }
      />
    );
  }

  const hasVoted = localVoted || (voteStatus?.voted ?? false);
  const votedOptionIds = localVoted ? localVotedIds : voteStatus?.optionIds ?? [];
  const isClosed = poll.status !== 'active';
  const author = poll.author;
  const isOwner = !!user?.id && user.id === author?.id;
  const sortedTags = poll.tags ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        {poll.coverImage && (
          <div className="overflow-hidden rounded-xl border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={poll.coverImage}
              alt=""
              className="h-48 w-full object-cover sm:h-64"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {poll.category && (
            <Badge
              variant="secondary"
              className="gap-1"
              style={
                poll.category.color
                  ? { backgroundColor: `${poll.category.color}1a`, color: poll.category.color }
                  : undefined
              }
            >
              {poll.category.icon && <span>{poll.category.icon}</span>}
              {poll.category.name}
            </Badge>
          )}
          <Badge variant="outline">{POLL_TYPE_LABELS[poll.type] ?? poll.type}</Badge>
          <Badge
            variant="outline"
            className={cn(
              'gap-1.5',
              isClosed
                ? 'border-transparent bg-muted text-muted-foreground'
                : 'border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                isClosed ? 'bg-muted-foreground' : 'bg-emerald-500',
              )}
            />
            {isClosed ? 'Closed' : 'Active'}
          </Badge>
        </div>

        <h1 className="text-3xl font-bold tracking-tight">{poll.title}</h1>
        {poll.description && (
          <p className="max-w-2xl text-muted-foreground">{poll.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {author ? (
            <Link
              href={`/u/${author.username}`}
              className="flex items-center gap-2 hover:text-foreground"
            >
              <Avatar className="h-7 w-7">
                {author.avatarUrl && <AvatarImage src={author.avatarUrl} alt="" />}
                <AvatarFallback className="text-[10px]">
                  {(author.name ?? author.username).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground">
                {author.name ?? author.username}
              </span>
            </Link>
          ) : (
            <span>Anonymous</span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {timeAgo(poll.createdAt)}
          </span>
        </div>

        {sortedTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sortedTags.map((tag) => (
              <Link key={tag.id} href={`/explore?tag=${tag.slug}`}>
                <Badge variant="outline" className="hover:border-primary/40">
                  #{tag.name}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main */}
        <div className="min-w-0">
          <Tabs defaultValue="vote">
            <TabsList>
              <TabsTrigger value="vote">Vote &amp; Results</TabsTrigger>
              <TabsTrigger value="charts">Charts</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
            </TabsList>

            <TabsContent value="vote" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <VoteBox
                    poll={poll}
                    results={results}
                    hasVoted={hasVoted}
                    votedOptionIds={votedOptionIds}
                    onVote={(optionIds, rating) => voteMutation.mutate({ optionIds, rating })}
                    submitting={voteMutation.isPending}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="charts" className="mt-4">
              {results ? (
                <ResultsCharts results={results} />
              ) : (
                <EmptyState
                  icon={<BarChart3 />}
                  title="No results yet"
                  description="Results will appear once votes are cast."
                />
              )}
            </TabsContent>

            <TabsContent value="comments" className="mt-4">
              <CommentSection pollId={poll.id} disabled={poll.commentsDisabled} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right rail */}
        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Poll stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Stat
                icon={<BarChart3 className="h-4 w-4 text-primary" />}
                label="Total votes"
                value={formatNumber(results?.totalVotes ?? poll.voteCount)}
              />
              <Stat
                icon={<Eye className="h-4 w-4" />}
                label="Views"
                value={formatNumber(poll.viewCount)}
              />
              <Stat
                icon={<MessageSquare className="h-4 w-4" />}
                label="Comments"
                value={formatNumber(poll.counts?.comments ?? 0)}
              />
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              variant={favorited ? 'default' : 'outline'}
              className="flex-1"
              onClick={toggleFavorite}
              disabled={favMutation.isPending}
            >
              <Heart className={cn('h-4 w-4', favorited && 'fill-current')} />
              {favorited ? 'Saved' : 'Save'}
            </Button>
            <ShareDialog
              pollSlug={poll.slug}
              trigger={
                <Button variant="outline" className="flex-1">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              }
            />
          </div>

          {isOwner && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Owner tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/polls/${poll.id}/edit`}>
                    <Pencil className="h-4 w-4" />
                    Edit poll
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/analytics/${poll.id}`}>
                    <LineChart className="h-4 w-4" />
                    Analytics
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
