'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import type { NotificationItem } from '@/lib/types';
import { notificationsApi } from '@/lib/services';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import { cn, timeAgo } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function NotificationsMenu() {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();

  const countKey = ['notifications', 'unread-count'];
  const listKey = ['notifications', 'list'];

  const { data: countData } = useQuery({
    queryKey: countKey,
    queryFn: () => notificationsApi.unreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });

  const { data: listData } = useQuery({
    queryKey: listKey,
    queryFn: () => notificationsApi.list({ page: 1, limit: 15 }),
    enabled: isAuthenticated,
  });

  const refreshAll = React.useCallback(() => {
    qc.invalidateQueries({ queryKey: countKey });
    qc.invalidateQueries({ queryKey: listKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc]);

  // Live updates over websocket.
  React.useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket();
    const handler = () => refreshAll();
    socket.on('notification', handler);
    return () => {
      socket.off('notification', handler);
    };
  }, [isAuthenticated, refreshAll]);

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: refreshAll,
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: refreshAll,
  });

  if (!isAuthenticated) return null;

  const unread = countData?.count ?? 0;
  const items = listData?.data ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markAll.mutate()}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            items.map((n) => <NotificationRow key={n.id} item={n} onRead={markRead.mutate} />)
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationRow({
  item,
  onRead,
}: {
  item: NotificationItem;
  onRead: (id: string) => void;
}) {
  const body = (
    <div
      className={cn(
        'flex gap-3 border-b px-4 py-3 text-sm transition-colors last:border-0 hover:bg-accent',
        !item.read && 'bg-primary/5',
      )}
      onClick={() => !item.read && onRead(item.id)}
    >
      {!item.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
      <div className={cn('min-w-0 flex-1', item.read && 'pl-5')}>
        <p className="leading-snug">{item.message}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(item.createdAt)}</p>
      </div>
    </div>
  );

  if (item.pollId) {
    return (
      <Link href={`/poll/${item.pollId}`} className="block">
        {body}
      </Link>
    );
  }
  return <div className="cursor-pointer">{body}</div>;
}
