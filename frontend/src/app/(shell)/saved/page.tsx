'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bookmark, Compass } from 'lucide-react';
import { favoritesApi } from '@/lib/services';
import { RequireAuth } from '@/components/common/require-auth';
import { EmptyState } from '@/components/common/empty-state';
import { Pagination } from '@/components/common/pagination';
import { PollCard } from '@/components/poll/poll-card';
import { PollCardSkeleton } from '@/components/poll/poll-card-skeleton';
import { Button } from '@/components/ui/button';

function SavedInner() {
  const [page, setPage] = React.useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['saved', page],
    queryFn: () => favoritesApi.list({ page }),
  });

  const polls = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Saved Polls</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Polls you&apos;ve bookmarked for later.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <PollCardSkeleton key={i} />
          ))}
        </div>
      ) : polls.length === 0 ? (
        <EmptyState
          icon={<Bookmark />}
          title="No saved polls yet"
          description="Bookmark polls you want to revisit and they'll show up here."
          action={
            <Button asChild>
              <Link href="/explore">
                <Compass className="h-4 w-4" />
                Explore polls
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {polls.map((poll) => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

export default function SavedPage() {
  return (
    <RequireAuth>
      <SavedInner />
    </RequireAuth>
  );
}
