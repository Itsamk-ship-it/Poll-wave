'use client';

import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Archive,
  ArchiveRestore,
  BarChart3,
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Play,
  Plus,
  Square,
  Trash2,
  Vote,
} from 'lucide-react';
import { pollsApi } from '@/lib/services';
import { getErrorMessage } from '@/lib/api';
import type { Poll } from '@/lib/types';
import { cn, formatNumber, timeAgo, POLL_TYPE_LABELS } from '@/lib/utils';
import { RequireAuth } from '@/components/common/require-auth';
import { EmptyState } from '@/components/common/empty-state';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Pagination } from '@/components/common/pagination';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type StatusFilter = 'all' | 'active' | 'closed';

function MyPollsInner() {
  const qc = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState<StatusFilter>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['my-polls', page, status],
    queryFn: () =>
      pollsApi.mine({ page, status: status === 'all' ? undefined : status }),
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['my-polls'] });

  const runAction = async (fn: () => Promise<unknown>, msg: string): Promise<void> => {
    try {
      await fn();
      toast.success(msg);
      invalidate();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Action failed'));
    }
  };

  const duplicate = useMutation({
    mutationFn: (id: string) => pollsApi.duplicate(id),
    onSuccess: () => {
      toast.success('Poll duplicated');
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Failed to duplicate')),
  });

  const polls = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Polls</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage everything you&apos;ve created.
          </p>
        </div>
        <Button asChild>
          <Link href="/create">
            <Plus className="h-4 w-4" />
            Create Poll
          </Link>
        </Button>
      </div>

      <Tabs
        value={status}
        onValueChange={(v) => {
          setStatus(v as StatusFilter);
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : polls.length === 0 ? (
        <EmptyState
          icon={<BarChart3 />}
          title="No polls here yet"
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
      ) : (
        <div className="space-y-3">
          {polls.map((poll) => (
            <PollRow
              key={poll.id}
              poll={poll}
              onDuplicate={() => duplicate.mutate(poll.id)}
              onPin={() =>
                runAction(
                  () => pollsApi.pin(poll.id, !poll.isPinned),
                  poll.isPinned ? 'Unpinned' : 'Pinned',
                )
              }
              onArchive={() =>
                runAction(
                  () => pollsApi.archive(poll.id, !poll.isArchived),
                  poll.isArchived ? 'Unarchived' : 'Archived',
                )
              }
              onClose={() =>
                runAction(
                  () => pollsApi.close(poll.id, poll.status === 'active'),
                  poll.status === 'active' ? 'Poll closed' : 'Poll reopened',
                )
              }
              onDelete={() =>
                runAction(() => pollsApi.remove(poll.id), 'Poll deleted')
              }
            />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

function PollRow({
  poll,
  onDuplicate,
  onPin,
  onArchive,
  onClose,
  onDelete,
}: {
  poll: Poll;
  onDuplicate: () => void;
  onPin: () => void;
  onArchive: () => void;
  onClose: () => void;
  onDelete: () => void | Promise<void>;
}) {
  const isActive = poll.status === 'active';

  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              'gap-1.5',
              isActive
                ? 'border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent bg-muted text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                isActive ? 'bg-emerald-500' : 'bg-muted-foreground',
              )}
            />
            {isActive ? 'Active' : poll.status === 'archived' ? 'Archived' : 'Closed'}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {poll.visibility.toLowerCase()}
          </Badge>
          <Badge variant="secondary">{POLL_TYPE_LABELS[poll.type] ?? poll.type}</Badge>
          {poll.isPinned && (
            <span className="inline-flex items-center text-primary" title="Pinned">
              <Pin className="h-3.5 w-3.5 fill-current" />
            </span>
          )}
        </div>
        <Link
          href={`/poll/${poll.slug}`}
          className="line-clamp-1 font-semibold hover:text-primary"
        >
          {poll.title}
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Vote className="h-3.5 w-3.5" />
            {formatNumber(poll.voteCount)} votes
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            {formatNumber(poll.viewCount)} views
          </span>
          <span>{timeAgo(poll.createdAt)}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Button asChild variant="outline" size="sm">
          <Link href={`/polls/${poll.id}/edit`}>
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        </Button>

        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="icon" aria-label="Delete poll">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          }
          title="Delete this poll?"
          description="This permanently removes the poll and all of its votes. This can't be undone."
          confirmText="Delete"
          destructive
          onConfirm={onDelete}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/poll/${poll.slug}`}>
                <Eye className="h-4 w-4" />
                View
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/analytics/${poll.id}`}>
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPin}>
              {poll.isPinned ? (
                <>
                  <PinOff className="h-4 w-4" />
                  Unpin
                </>
              ) : (
                <>
                  <Pin className="h-4 w-4" />
                  Pin
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onClose}>
              {isActive ? (
                <>
                  <Square className="h-4 w-4" />
                  Close
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Reopen
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onArchive}>
              {poll.isArchived ? (
                <>
                  <ArchiveRestore className="h-4 w-4" />
                  Unarchive
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  Archive
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}

export default function MyPollsPage() {
  return (
    <RequireAuth>
      <MyPollsInner />
    </RequireAuth>
  );
}
