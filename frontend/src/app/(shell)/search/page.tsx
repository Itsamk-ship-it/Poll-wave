'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, SearchX } from 'lucide-react';
import { searchApi } from '@/lib/services';
import { useDebounce } from '@/hooks/use-debounce';
import { POLL_TYPE_LABELS } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PollCard } from '@/components/poll/poll-card';
import { PollCardSkeleton } from '@/components/poll/poll-card-skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { Pagination } from '@/components/common/pagination';
import { PageLoading } from '@/components/common/loading';

const ALL = 'all';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';

  const [q, setQ] = React.useState(initialQ);
  const [type, setType] = React.useState(ALL);
  const [sort, setSort] = React.useState('recent');
  const [page, setPage] = React.useState(1);
  const debouncedQ = useDebounce(q, 350);

  // Keep the URL in sync with the debounced query.
  React.useEffect(() => {
    const term = debouncedQ.trim();
    router.replace(term ? `/search?q=${encodeURIComponent(term)}` : '/search');
  }, [debouncedQ, router]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedQ, type, sort]);

  const trimmed = debouncedQ.trim();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', trimmed, type, sort, page],
    queryFn: () =>
      searchApi.query({
        q: trimmed,
        page,
        limit: 12,
        sort,
        ...(type !== ALL ? { type } : {}),
      }),
    enabled: trimmed.length > 0,
    placeholderData: (prev) => prev,
  });

  const polls = data?.polls;
  const users = data?.users ?? [];
  const categories = data?.categories ?? [];
  const tags = data?.tags ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">Find polls, people, categories and tags.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search PollWave…"
            className="pl-9"
            autoFocus
            aria-label="Search"
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full sm:w-44">
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
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recent</SelectItem>
            <SelectItem value="popular">Popular</SelectItem>
            <SelectItem value="trending">Trending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {trimmed.length === 0 ? (
        <EmptyState
          icon={<SearchIcon />}
          title="Start typing to search"
          description="Search across polls, users, categories and tags."
        />
      ) : (
        <Tabs defaultValue="polls">
          <TabsList>
            <TabsTrigger value="polls">Polls {polls ? `(${polls.total})` : ''}</TabsTrigger>
            <TabsTrigger value="users">Users {users.length ? `(${users.length})` : ''}</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
          </TabsList>

          {/* Polls */}
          <TabsContent value="polls" className="mt-4">
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <PollCardSkeleton key={i} />
                ))}
              </div>
            ) : !polls || polls.items.length === 0 ? (
              <EmptyState icon={<SearchX />} title="No polls found" />
            ) : (
              <>
                <div
                  className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${
                    isFetching ? 'opacity-60 transition-opacity' : ''
                  }`}
                >
                  {polls.items.map((poll) => (
                    <PollCard key={poll.id} poll={poll} />
                  ))}
                </div>
                <Pagination
                  page={page}
                  totalPages={polls.totalPages}
                  onPageChange={setPage}
                  className="pt-6"
                />
              </>
            )}
          </TabsContent>

          {/* Users */}
          <TabsContent value="users" className="mt-4">
            {users.length === 0 ? (
              <EmptyState icon={<SearchX />} title="No users found" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {users.map((u) => (
                  <Link
                    key={u.id}
                    href={`/u/${u.username}`}
                    className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/30"
                  >
                    <Avatar className="h-11 w-11">
                      {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt="" />}
                      <AvatarFallback>
                        {(u.name ?? u.username).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{u.name ?? u.username}</p>
                      <p className="truncate text-sm text-muted-foreground">@{u.username}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Categories */}
          <TabsContent value="categories" className="mt-4">
            {categories.length === 0 ? (
              <EmptyState icon={<SearchX />} title="No categories found" />
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <Link key={c.id} href={`/explore?category=${c.slug}`}>
                    <Badge
                      variant="secondary"
                      className="gap-1 px-3 py-1.5 text-sm hover:opacity-80"
                      style={
                        c.color
                          ? { backgroundColor: `${c.color}1a`, color: c.color }
                          : undefined
                      }
                    >
                      {c.icon && <span>{c.icon}</span>}
                      {c.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tags */}
          <TabsContent value="tags" className="mt-4">
            {tags.length === 0 ? (
              <EmptyState icon={<SearchX />} title="No tags found" />
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <Link key={t.id} href={`/explore?tag=${t.slug}`}>
                    <Badge variant="outline" className="px-3 py-1.5 text-sm hover:border-primary/40">
                      #{t.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SearchContent />
    </Suspense>
  );
}
