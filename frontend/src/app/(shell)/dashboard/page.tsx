'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  CheckCircle2,
  Eye,
  Globe,
  Lock,
  Plus,
  Vote,
  XCircle,
} from 'lucide-react';
import { dashboardApi } from '@/lib/services';
import { formatNumber } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { RequireAuth } from '@/components/common/require-auth';
import { StatCard } from '@/components/common/stat-card';
import { EmptyState } from '@/components/common/empty-state';
import { PollCard } from '@/components/poll/poll-card';
import { PollCardSkeleton } from '@/components/poll/poll-card-skeleton';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function DashboardInner() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get(),
  });

  const greeting = user?.name ?? user?.username ?? 'there';

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back, {greeting}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s how your polls are doing.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/create">
            <Plus className="h-4 w-4" />
            Create Poll
          </Link>
        </Button>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Polls"
            value={formatNumber(data?.totalPolls ?? 0)}
            icon={<BarChart3 />}
          />
          <StatCard
            label="Active"
            value={formatNumber(data?.activePolls ?? 0)}
            icon={<CheckCircle2 />}
          />
          <StatCard
            label="Closed"
            value={formatNumber(data?.closedPolls ?? 0)}
            icon={<XCircle />}
          />
          <StatCard
            label="Votes Received"
            value={formatNumber(data?.totalVotesReceived ?? 0)}
            icon={<Vote />}
          />
          <StatCard
            label="Public"
            value={formatNumber(data?.publicPolls ?? 0)}
            icon={<Globe />}
          />
          <StatCard
            label="Private"
            value={formatNumber(data?.privatePolls ?? 0)}
            icon={<Lock />}
          />
          <StatCard
            label="Total Views"
            value={formatNumber(data?.totalViews ?? 0)}
            icon={<Eye />}
          />
        </div>
      )}

      {/* Recent polls */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Polls</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/my-polls">View all</Link>
          </Button>
        </div>
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <PollCardSkeleton key={i} />
            ))}
          </div>
        ) : data && data.recentPolls.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.recentPolls.map((poll) => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<BarChart3 />}
            title="No polls yet"
            description="Create your first poll to start collecting votes."
            action={
              <Button asChild>
                <Link href="/create">
                  <Plus className="h-4 w-4" />
                  Create Poll
                </Link>
              </Button>
            }
          />
        )}
      </section>

      {/* Popular polls */}
      {!isLoading && data && data.popularPolls.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Most Popular</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.popularPolls.map((poll) => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardInner />
    </RequireAuth>
  );
}
