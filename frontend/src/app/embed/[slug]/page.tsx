'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Vote } from 'lucide-react';
import { pollsApi, votesApi } from '@/lib/services';
import { getErrorMessage } from '@/lib/api';
import { usePollLive } from '@/hooks/use-poll-live';
import { VoteBox } from '@/components/poll/vote-box';
import { PageLoading } from '@/components/common/loading';
import { EmptyState } from '@/components/common/empty-state';

export default function EmbedPollPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data: poll, isLoading, isError } = useQuery({
    queryKey: ['poll', slug],
    queryFn: () => pollsApi.get(slug),
    enabled: !!slug,
  });

  const pollId = poll?.id ?? '';
  const { results, setResults } = usePollLive(pollId, slug);

  const { data: voteStatus } = useQuery({
    queryKey: ['vote-status', pollId],
    queryFn: () => votesApi.status(pollId),
    enabled: !!pollId,
  });

  const [localVoted, setLocalVoted] = React.useState(false);
  const [localVotedIds, setLocalVotedIds] = React.useState<string[]>([]);

  const voteMutation = useMutation({
    mutationFn: (vars: { optionIds: string[]; rating?: number }) =>
      votesApi.cast({ pollId, optionIds: vars.optionIds, rating: vars.rating }),
    onSuccess: (data, vars) => {
      setResults(data.results);
      setLocalVoted(true);
      setLocalVotedIds(vars.optionIds);
      toast.success(data.message || 'Vote submitted!');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not submit your vote')),
  });

  if (isLoading) return <PageLoading label="Loading…" />;

  if (isError || !poll) {
    return (
      <div className="p-4">
        <EmptyState title="Poll unavailable" description="This poll could not be loaded." />
      </div>
    );
  }

  const hasVoted = localVoted || (voteStatus?.voted ?? false);
  const votedOptionIds = localVoted ? localVotedIds : voteStatus?.optionIds ?? [];

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col p-3">
      <h1 className="mb-3 line-clamp-2 text-base font-semibold leading-snug">{poll.title}</h1>

      <div className="flex-1">
        <VoteBox
          poll={poll}
          results={results}
          hasVoted={hasVoted}
          votedOptionIds={votedOptionIds}
          onVote={(optionIds, rating) => voteMutation.mutate({ optionIds, rating })}
          submitting={voteMutation.isPending}
        />
      </div>

      <a
        href={`/poll/${poll.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center justify-center gap-1.5 border-t pt-3 text-xs text-muted-foreground hover:text-foreground"
      >
        <span className="flex h-4 w-4 items-center justify-center rounded bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
          <Vote className="h-2.5 w-2.5" />
        </span>
        Powered by PollWave
      </a>
    </div>
  );
}
