'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Compass, SearchX } from 'lucide-react';
import { categoriesApi, pollsApi } from '@/lib/services';
import type { PollListParams } from '@/lib/services';
import { POLL_TYPE_LABELS } from '@/lib/utils';
import { PollCard } from '@/components/poll/poll-card';
import { PollCardSkeleton } from '@/components/poll/poll-card-skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { Pagination } from '@/components/common/pagination';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ALL = 'all';
const SORTS = [
  { value: 'recent', label: 'Recent' },
  { value: 'popular', label: 'Popular' },
  { value: 'trending', label: 'Trending' },
];

export default function ExplorePage() {
  const [category, setCategory] = React.useState(ALL);
  const [type, setType] = React.useState(ALL);
  const [sort, setSort] = React.useState('recent');
  const [page, setPage] = React.useState(1);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
    staleTime: 5 * 60_000,
  });

  const params: PollListParams = {
    page,
    limit: 12,
    sort,
    ...(category !== ALL ? { category } : {}),
    ...(type !== ALL ? { type } : {}),
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['polls', 'explore', params],
    queryFn: () => pollsApi.list(params),
    placeholderData: (prev) => prev,
  });

  const polls = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  const resetPage = () => setPage(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Compass className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Explore Polls</h1>
          <p className="text-sm text-muted-foreground">
            Discover polls from the community and cast your vote.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v);
              resetPage();
            }}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.slug}>
                  {c.icon ? `${c.icon} ` : ''}
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={type}
            onValueChange={(v) => {
              setType(v);
              resetPage();
            }}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              {Object.entries(POLL_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs
          value={sort}
          onValueChange={(v) => {
            setSort(v);
            resetPage();
          }}
        >
          <TabsList>
            {SORTS.map((s) => (
              <TabsTrigger key={s.value} value={s.value}>
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <PollCardSkeleton key={i} />
          ))}
        </div>
      ) : polls.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="No polls found"
          description="Try adjusting your filters to see more polls."
        />
      ) : (
        <>
          <div
            className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${
              isFetching ? 'opacity-60 transition-opacity' : ''
            }`}
          >
            {polls.map((poll) => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="pt-2" />
        </>
      )}
    </div>
  );
}
