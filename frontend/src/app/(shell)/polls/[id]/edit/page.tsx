'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { pollsApi } from '@/lib/services';
import { getErrorMessage } from '@/lib/api';
import type { Poll } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { RequireAuth } from '@/components/common/require-auth';
import { PollForm } from '@/components/poll/poll-form';
import { EmptyState } from '@/components/common/empty-state';
import { PageLoading } from '@/components/common/loading';

function EditInner() {
  const params = useParams();
  const id = String(params.id);
  const router = useRouter();
  const { user } = useAuth();

  const { data: poll, isLoading, isError } = useQuery({
    queryKey: ['poll', id],
    queryFn: () => pollsApi.get(id),
  });

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => pollsApi.update(id, body),
    onSuccess: (updated: Poll) => {
      toast.success('Poll updated');
      router.push(`/poll/${updated.slug}`);
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Failed to update poll')),
  });

  if (isLoading) return <PageLoading label="Loading poll…" />;

  if (isError || !poll) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <EmptyState
          icon={<Lock />}
          title="Poll not found"
          description="We couldn't load this poll for editing."
        />
      </div>
    );
  }

  if (poll.author?.id !== user?.id) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <EmptyState
          icon={<Lock />}
          title="You can't edit this poll"
          description="Only the poll's author can make changes."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Edit Poll</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update the details of &ldquo;{poll.title}&rdquo;.
        </p>
      </div>
      <PollForm
        mode="edit"
        initialPoll={poll}
        onSubmit={(values) => mutation.mutate(values)}
        submitting={mutation.isPending}
      />
    </div>
  );
}

export default function EditPollPage() {
  return (
    <RequireAuth>
      <EditInner />
    </RequireAuth>
  );
}
