'use client';

import { useEffect, useState } from 'react';
import { getSocket, joinPoll, leavePoll } from '@/lib/socket';
import { pollsApi } from '@/lib/services';
import type { PollResults } from '@/lib/types';

/**
 * Subscribe to a poll's live results over Socket.IO.
 * Seeds from the REST endpoint, then applies real-time `poll:results` updates.
 */
export function usePollLive(pollId: string, slug: string, initial?: PollResults | null) {
  const [results, setResults] = useState<PollResults | null>(initial ?? null);

  useEffect(() => {
    let active = true;

    if (!initial) {
      pollsApi
        .results(slug)
        .then((r) => active && setResults(r))
        .catch(() => {});
    }

    const socket = getSocket();
    joinPoll(pollId);
    const handler = (payload: PollResults) => {
      if (active && payload.pollId === pollId) setResults(payload);
    };
    socket.on('poll:results', handler);

    return () => {
      active = false;
      socket.off('poll:results', handler);
      leavePoll(pollId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollId, slug]);

  return { results, setResults };
}
