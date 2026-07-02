'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, UserX, Vote } from 'lucide-react';
import { toast } from 'sonner';
import { usersApi } from '@/lib/services';
import { getErrorMessage } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { formatNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PollCard } from '@/components/poll/poll-card';
import { PollCardSkeleton } from '@/components/poll/poll-card-skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { Pagination } from '@/components/common/pagination';
import { PageLoading } from '@/components/common/loading';

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params.username;
  const qc = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [page, setPage] = React.useState(1);

  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => usersApi.profile(username),
    enabled: !!username,
  });

  const { data: pollsPage, isLoading: pollsLoading } = useQuery({
    queryKey: ['user-polls', username, page],
    queryFn: () => usersApi.polls(username, { page, limit: 9 }),
    enabled: !!username,
    placeholderData: (prev) => prev,
  });

  const followMutation = useMutation({
    mutationFn: (next: boolean) =>
      next ? usersApi.follow(username) : usersApi.unfollow(username),
    onSuccess: (_data, next) => {
      qc.invalidateQueries({ queryKey: ['profile', username] });
      toast.success(next ? 'Following' : 'Unfollowed');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not update follow')),
  });

  if (isLoading) return <PageLoading label="Loading profile…" />;

  if (isError || !profile) {
    return (
      <EmptyState
        icon={<UserX />}
        title="User not found"
        description="This profile doesn't exist or has been removed."
        action={
          <Button asChild>
            <Link href="/explore">Explore polls</Link>
          </Button>
        }
      />
    );
  }

  const isSelf = user?.username === profile.username;
  const joined = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : null;

  const stats = [
    { label: 'Polls', value: profile.counts.polls },
    { label: 'Votes', value: profile.counts.votes },
    { label: 'Followers', value: profile.counts.followers },
    { label: 'Following', value: profile.counts.following },
  ];

  const polls = pollsPage?.data ?? [];
  const totalPages = pollsPage?.meta.totalPages ?? 1;

  return (
    <div className="space-y-8">
      {/* Header */}
      <Card>
        <CardContent className="flex flex-col gap-6 pt-6 sm:flex-row sm:items-start">
          <Avatar className="h-24 w-24 shrink-0">
            {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt="" />}
            <AvatarFallback className="text-2xl">
              {(profile.name ?? profile.username).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {profile.name ?? profile.username}
                </h1>
                <p className="text-muted-foreground">@{profile.username}</p>
              </div>

              {isAuthenticated && !isSelf && (
                <Button
                  variant={profile.isFollowing ? 'outline' : 'default'}
                  onClick={() => followMutation.mutate(!profile.isFollowing)}
                  disabled={followMutation.isPending}
                >
                  {profile.isFollowing ? 'Unfollow' : 'Follow'}
                </Button>
              )}
            </div>

            {profile.bio && <p className="mt-3 max-w-2xl text-sm">{profile.bio}</p>}

            {joined && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                Joined {joined}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border bg-card/40 px-4 py-2 text-center"
                >
                  <p className="text-lg font-bold">{formatNumber(s.value)}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Polls */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          {isSelf ? 'Your polls' : `Polls by ${profile.name ?? profile.username}`}
        </h2>

        {pollsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <PollCardSkeleton key={i} />
            ))}
          </div>
        ) : polls.length === 0 ? (
          <EmptyState
            icon={<Vote />}
            title="No polls yet"
            description={
              isSelf
                ? 'Create your first poll to see it here.'
                : "This user hasn't published any polls."
            }
            action={
              isSelf ? (
                <Button asChild>
                  <Link href="/create">Create a poll</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {polls.map((poll) => (
                <PollCard key={poll.id} poll={poll} />
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              className="pt-2"
            />
          </>
        )}
      </div>
    </div>
  );
}
