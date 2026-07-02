'use client';

import * as React from 'react';
import { Check, Loader2, Star } from 'lucide-react';
import type { Poll, PollResults, PollOption } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ResultsView } from './results-view';

export interface VoteBoxProps {
  poll: Poll;
  results: PollResults | null;
  hasVoted: boolean;
  votedOptionIds: string[];
  onVote: (optionIds: string[], rating?: number) => void;
  submitting?: boolean;
}

const isMulti = (poll: Poll) => poll.type === 'MULTIPLE_CHOICE' || poll.allowMultiple;

export function VoteBox({
  poll,
  results,
  hasVoted,
  votedOptionIds,
  onVote,
  submitting,
}: VoteBoxProps) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [rating, setRating] = React.useState(0);
  const [hoverRating, setHoverRating] = React.useState(0);

  const closed = poll.status !== 'active';
  const options = [...poll.options].sort((a, b) => a.order - b.order);

  // Show results when already voted or the poll is closed.
  if ((hasVoted || closed) && results) {
    return (
      <div className="space-y-4">
        {hasVoted && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Check className="h-4 w-4" /> You voted
          </div>
        )}
        {closed && !hasVoted && (
          <p className="text-sm text-muted-foreground">This poll is closed. Here are the results.</p>
        )}
        <ResultsView results={results} votedOptionIds={votedOptionIds} type={poll.type} />
      </div>
    );
  }

  const toggle = (id: string) => {
    if (isMulti(poll)) {
      setSelected((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    } else {
      setSelected([id]);
    }
  };

  const canSubmit =
    poll.type === 'RATING' ? rating > 0 : selected.length > 0;

  const handleSubmit = () => {
    if (poll.type === 'RATING') {
      onVote(options[0] ? [options[0].id] : [], rating);
    } else {
      onVote(selected);
    }
  };

  return (
    <div className="space-y-4">
      {poll.type === 'RATING' ? (
        <RatingSelector
          value={hoverRating || rating}
          onHover={setHoverRating}
          onSelect={setRating}
          disabled={submitting}
        />
      ) : poll.type === 'EMOJI' ? (
        <div className="flex flex-wrap gap-3">
          {options.map((opt) => (
            <EmojiOption
              key={opt.id}
              option={opt}
              selected={selected.includes(opt.id)}
              onClick={() => toggle(opt.id)}
              disabled={submitting}
            />
          ))}
        </div>
      ) : poll.type === 'IMAGE_CHOICE' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {options.map((opt) => (
            <ImageOption
              key={opt.id}
              option={opt}
              selected={selected.includes(opt.id)}
              onClick={() => toggle(opt.id)}
              disabled={submitting}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {options.map((opt) => (
            <ChoiceOption
              key={opt.id}
              option={opt}
              multi={isMulti(poll)}
              selected={selected.includes(opt.id)}
              onClick={() => toggle(opt.id)}
              disabled={submitting}
            />
          ))}
        </div>
      )}

      {isMulti(poll) && poll.type !== 'RATING' && (
        <p className="text-xs text-muted-foreground">You can select more than one option.</p>
      )}

      <Button
        className="w-full"
        size="lg"
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? 'Submitting…' : 'Vote'}
      </Button>
    </div>
  );
}

function ChoiceOption({
  option,
  multi,
  selected,
  onClick,
  disabled,
}: {
  option: PollOption;
  multi: boolean;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all disabled:opacity-60',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border hover:border-primary/40 hover:bg-accent',
      )}
    >
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center border transition-colors',
          multi ? 'rounded-md' : 'rounded-full',
          selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
        )}
      >
        {selected && <Check className="h-3.5 w-3.5" />}
      </span>
      <span className="font-medium">{option.text}</span>
    </button>
  );
}

function ImageOption({
  option,
  selected,
  onClick,
  disabled,
}: {
  option: PollOption;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group relative overflow-hidden rounded-xl border text-left transition-all disabled:opacity-60',
        selected ? 'border-primary ring-2 ring-primary' : 'border-border hover:border-primary/40',
      )}
    >
      {option.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={option.imageUrl} alt={option.text} className="aspect-square w-full object-cover" />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-muted text-xs text-muted-foreground">
          No image
        </div>
      )}
      {selected && (
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-4 w-4" />
        </span>
      )}
      <div className="p-2 text-sm font-medium">{option.text}</div>
    </button>
  );
}

function EmojiOption({
  option,
  selected,
  onClick,
  disabled,
}: {
  option: PollOption;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={option.text}
      className={cn(
        'flex min-w-[64px] flex-col items-center gap-1 rounded-xl border px-4 py-3 transition-all disabled:opacity-60',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border hover:border-primary/40 hover:bg-accent',
      )}
    >
      <span className="text-3xl leading-none">{option.text}</span>
    </button>
  );
}

function RatingSelector({
  value,
  onHover,
  onSelect,
  disabled,
}: {
  value: number;
  onHover: (n: number) => void;
  onSelect: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-center gap-2 py-2"
      onMouseLeave={() => onHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onMouseEnter={() => onHover(n)}
          onClick={() => onSelect(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className="transition-transform hover:scale-110 disabled:opacity-60"
        >
          <Star
            className={cn(
              'h-9 w-9 transition-colors',
              n <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40',
            )}
          />
        </button>
      ))}
    </div>
  );
}
