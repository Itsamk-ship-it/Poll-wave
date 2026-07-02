'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Loader2, MessageSquare, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import type { Comment } from '@/lib/types';
import { commentsApi } from '@/lib/services';
import { getErrorMessage } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { cn, timeAgo } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/common/empty-state';
import { ConfirmDialog } from '@/components/common/confirm-dialog';

export interface CommentSectionProps {
  pollId: string;
  disabled?: boolean;
}

function initials(name: string | null, username: string) {
  return (name ?? username).trim().slice(0, 2).toUpperCase();
}

export function CommentSection({ pollId, disabled }: CommentSectionProps) {
  const qc = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [content, setContent] = React.useState('');
  const key = ['comments', pollId];

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => commentsApi.list(pollId, { page: 1, limit: 50 }),
    enabled: !disabled,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const addMutation = useMutation({
    mutationFn: (text: string) => commentsApi.add(pollId, text),
    onSuccess: () => {
      setContent('');
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Failed to post comment')),
  });

  if (disabled) {
    return (
      <EmptyState
        icon={<MessageSquare />}
        title="Comments are disabled"
        description="The poll creator has turned off comments for this poll."
      />
    );
  }

  const comments = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Comments</h3>
        {data && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {data.meta.total}
          </span>
        )}
      </div>

      {isAuthenticated ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const text = content.trim();
            if (text) addMutation.mutate(text);
          }}
          className="space-y-2"
        >
          <Textarea
            placeholder="Add a comment…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={!content.trim() || addMutation.isPending}>
              {addMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Post comment
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-lg border border-dashed bg-card/40 p-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>{' '}
          to join the conversation.
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <EmptyState
          icon={<MessageSquare />}
          title="No comments yet"
          description="Be the first to share your thoughts."
        />
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              canManage={isAuthenticated && user?.id === c.author.id}
              onChanged={invalidate}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentRow({
  comment,
  canManage,
  onChanged,
}: {
  comment: Comment;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(comment.content);
  // Optimistic local like state for snappy UX.
  const [liked, setLiked] = React.useState(comment.likedByMe);
  const [likeCount, setLikeCount] = React.useState(comment.likeCount);

  React.useEffect(() => {
    setLiked(comment.likedByMe);
    setLikeCount(comment.likeCount);
  }, [comment.likedByMe, comment.likeCount]);

  const likeMutation = useMutation({
    mutationFn: () => (liked ? commentsApi.unlike(comment.id) : commentsApi.like(comment.id)),
    onMutate: () => {
      setLiked((v) => !v);
      setLikeCount((n) => n + (liked ? -1 : 1));
    },
    onSuccess: (res) => {
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    },
    onError: (e) => {
      setLiked(comment.likedByMe);
      setLikeCount(comment.likeCount);
      toast.error(getErrorMessage(e, 'Failed to update like'));
    },
  });

  const editMutation = useMutation({
    mutationFn: (text: string) => commentsApi.edit(comment.id, text),
    onSuccess: () => {
      setEditing(false);
      toast.success('Comment updated');
      onChanged();
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Failed to edit comment')),
  });

  const removeMutation = useMutation({
    mutationFn: () => commentsApi.remove(comment.id),
    onSuccess: () => {
      toast.success('Comment deleted');
      onChanged();
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Failed to delete comment')),
  });

  const author = comment.author;

  return (
    <li className="flex gap-3">
      <Link href={`/u/${author.username}`}>
        <Avatar className="h-9 w-9">
          {author.avatarUrl && <AvatarImage src={author.avatarUrl} alt="" />}
          <AvatarFallback className="text-xs">
            {initials(author.name, author.username)}
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link href={`/u/${author.username}`} className="text-sm font-medium hover:text-primary">
            {author.name ?? author.username}
          </Link>
          <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
          {comment.updatedAt !== comment.createdAt && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
        </div>

        {editing ? (
          <div className="mt-2 space-y-2">
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => editMutation.mutate(draft.trim())}
                disabled={!draft.trim() || editMutation.isPending}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraft(comment.content);
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{comment.content}</p>
        )}

        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => likeMutation.mutate()}
            className={cn(
              'inline-flex items-center gap-1 transition-colors hover:text-foreground',
              liked && 'text-primary hover:text-primary',
            )}
          >
            <Heart className={cn('h-3.5 w-3.5', liked && 'fill-current')} />
            {likeCount > 0 && likeCount}
          </button>
          {canManage && !editing && (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
              <ConfirmDialog
                trigger={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 transition-colors hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                }
                title="Delete comment?"
                description="This action cannot be undone."
                confirmText="Delete"
                destructive
                onConfirm={async () => {
                  await removeMutation.mutateAsync();
                }}
              />
            </>
          )}
        </div>
      </div>
    </li>
  );
}
