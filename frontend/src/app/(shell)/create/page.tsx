'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { pollsApi } from '@/lib/services';
import { getErrorMessage } from '@/lib/api';
import type { Poll } from '@/lib/types';
import { RequireAuth } from '@/components/common/require-auth';
import { PollForm } from '@/components/poll/poll-form';

function CreateInner() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => pollsApi.create(body),
    onSuccess: (poll: Poll) => {
      toast.success('Poll created!');
      router.push(`/poll/${poll.slug}`);
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Failed to create poll')),
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Create a Poll</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Craft your question and let people weigh in.
        </p>
      </div>
      <PollForm
        mode="create"
        onSubmit={(values) => mutation.mutate(values)}
        submitting={mutation.isPending}
      />
    </div>
  );
}

export default function CreatePage() {
  return (
    <RequireAuth>
      <CreateInner />
    </RequireAuth>
  );
}
