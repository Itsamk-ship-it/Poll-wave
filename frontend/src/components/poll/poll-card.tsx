import Link from 'next/link';
import { BarChart3, Eye, MessageSquare, Pin } from 'lucide-react';
import type { Poll } from '@/lib/types';
import { cn, formatNumber, timeAgo, POLL_TYPE_LABELS } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function initials(name: string | null, username: string) {
  const base = (name ?? username).trim();
  return base.slice(0, 2).toUpperCase();
}

export function PollCard({ poll }: { poll: Poll }) {
  const author = poll.author;
  const comments = poll.counts?.comments ?? 0;
  const isClosed = poll.status !== 'active';

  return (
    <Card className="group relative flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30">
      {poll.coverImage && (
        <Link href={`/poll/${poll.slug}`} className="block overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={poll.coverImage}
            alt=""
            className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </Link>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {poll.category && (
            <Badge
              variant="secondary"
              className="gap-1"
              style={
                poll.category.color
                  ? {
                      backgroundColor: `${poll.category.color}1a`,
                      color: poll.category.color,
                    }
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
          {poll.isPinned && (
            <span className="ml-auto inline-flex items-center text-primary" title="Pinned">
              <Pin className="h-4 w-4 fill-current" />
            </span>
          )}
        </div>

        <Link href={`/poll/${poll.slug}`}>
          <h3 className="line-clamp-2 text-base font-semibold leading-snug transition-colors group-hover:text-primary">
            {poll.title}
          </h3>
        </Link>
        {poll.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
            {poll.description}
          </p>
        )}

        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            {formatNumber(poll.voteCount)} votes
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            {formatNumber(poll.viewCount)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            {formatNumber(comments)}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t pt-4">
          {author ? (
            <Link
              href={`/u/${author.username}`}
              className="flex items-center gap-2 text-sm hover:text-primary"
            >
              <Avatar className="h-6 w-6">
                {author.avatarUrl && <AvatarImage src={author.avatarUrl} alt="" />}
                <AvatarFallback className="text-[10px]">
                  {initials(author.name, author.username)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{author.name ?? author.username}</span>
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground">Anonymous</span>
          )}
          <span className="text-xs text-muted-foreground">{timeAgo(poll.createdAt)}</span>
        </div>
      </div>
    </Card>
  );
}
