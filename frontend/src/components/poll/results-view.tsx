'use client';

import { Check } from 'lucide-react';
import type { PollResults, PollType } from '@/lib/types';
import { cn, formatNumber } from '@/lib/utils';

export interface ResultsViewProps {
  results: PollResults;
  votedOptionIds?: string[];
  type?: PollType;
}

export function ResultsView({ results, votedOptionIds = [], type }: ResultsViewProps) {
  const voted = new Set(votedOptionIds);
  const options = [...results.options].sort((a, b) => b.votes - a.votes);
  const leader = options[0]?.votes ?? 0;

  return (
    <div className="space-y-3">
      {options.map((opt) => {
        const isVoted = voted.has(opt.optionId);
        const isLeader = opt.votes === leader && leader > 0;
        const pct = Math.max(0, Math.min(100, opt.percentage));
        return (
          <div
            key={opt.optionId}
            className={cn(
              'relative overflow-hidden rounded-lg border px-4 py-3 transition-colors',
              isVoted ? 'border-primary/50 bg-primary/5' : 'border-border',
            )}
          >
            <div
              className={cn(
                'absolute inset-y-0 left-0 rounded-lg transition-[width] duration-700 ease-out',
                isVoted ? 'bg-primary/20' : isLeader ? 'bg-primary/10' : 'bg-muted',
              )}
              style={{ width: `${pct}%` }}
              aria-hidden
            />
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                {opt.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={opt.imageUrl}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-md object-cover"
                  />
                )}
                <span className="truncate text-sm font-medium">{opt.text}</span>
                {isVoted && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    <Check className="h-3 w-3" /> You
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-baseline gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatNumber(opt.votes)}
                </span>
                <span className="w-12 text-right text-sm font-semibold tabular-nums">
                  {pct.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
      <p className="pt-1 text-sm text-muted-foreground">
        {formatNumber(results.totalVotes)} total {results.totalVotes === 1 ? 'vote' : 'votes'}
        {type ? '' : ''}
      </p>
    </div>
  );
}
