'use client';

import * as React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, GripVertical, Plus, X } from 'lucide-react';
import type { Poll, PollType, Visibility } from '@/lib/types';
import { categoriesApi } from '@/lib/services';
import { POLL_TYPE_LABELS, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const POLL_TYPES: PollType[] = [
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'YES_NO',
  'RATING',
  'EMOJI',
  'IMAGE_CHOICE',
];

const CHOICE_TYPES: PollType[] = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'IMAGE_CHOICE'];

const NO_CATEGORY = '__none__';

const optionSchema = z.object({
  text: z.string().min(1, 'Option text is required'),
  imageUrl: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
});

const formSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be at most 200 characters'),
  description: z.string().optional(),
  coverImage: z.string().url('Enter a valid image URL').or(z.literal('')).optional(),
  type: z.enum([
    'SINGLE_CHOICE',
    'MULTIPLE_CHOICE',
    'YES_NO',
    'RATING',
    'EMOJI',
    'IMAGE_CHOICE',
  ]),
  categoryId: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']),
  expiresAt: z.string().optional(),
  allowMultiple: z.boolean(),
  oneVotePerIp: z.boolean(),
  requireLogin: z.boolean(),
  commentsDisabled: z.boolean(),
  options: z.array(optionSchema),
});

type FormValues = z.infer<typeof formSchema>;

/** Format an ISO string for a `datetime-local` input (local time, no seconds). */
function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export interface PollFormProps {
  mode: 'create' | 'edit';
  initialPoll?: Poll;
  onSubmit: (values: Record<string, unknown>) => void;
  submitting?: boolean;
}

export function PollForm({ mode, initialPoll, onSubmit, submitting }: PollFormProps) {
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  });

  const defaults = React.useMemo<FormValues>(() => {
    if (initialPoll) {
      return {
        title: initialPoll.title,
        description: initialPoll.description ?? '',
        coverImage: initialPoll.coverImage ?? '',
        type: initialPoll.type,
        categoryId: initialPoll.category?.id ?? NO_CATEGORY,
        visibility: initialPoll.visibility,
        expiresAt: toDatetimeLocal(initialPoll.expiresAt),
        allowMultiple: initialPoll.allowMultiple,
        oneVotePerIp: initialPoll.oneVotePerIp,
        requireLogin: initialPoll.requireLogin,
        commentsDisabled: initialPoll.commentsDisabled,
        options: initialPoll.options.length
          ? initialPoll.options
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((o) => ({ text: o.text, imageUrl: o.imageUrl ?? '' }))
          : [
              { text: '', imageUrl: '' },
              { text: '', imageUrl: '' },
            ],
      };
    }
    return {
      title: '',
      description: '',
      coverImage: '',
      type: 'SINGLE_CHOICE',
      categoryId: NO_CATEGORY,
      visibility: 'PUBLIC',
      expiresAt: '',
      allowMultiple: false,
      oneVotePerIp: false,
      requireLogin: false,
      commentsDisabled: false,
      options: [
        { text: '', imageUrl: '' },
        { text: '', imageUrl: '' },
      ],
    };
  }, [initialPoll]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults,
  });

  const { fields, append, remove, swap } = useFieldArray({ control, name: 'options' });

  const type = watch('type');
  const isChoice = CHOICE_TYPES.includes(type);
  const isImageChoice = type === 'IMAGE_CHOICE';

  // Tags — managed locally as a string[].
  const [tags, setTags] = React.useState<string[]>(
    initialPoll?.tags.map((t) => t.name) ?? [],
  );
  const [tagInput, setTagInput] = React.useState('');

  const addTag = (raw: string) => {
    const value = raw.trim().replace(/,$/, '').trim();
    if (!value) return;
    setTags((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setTagInput('');
  };

  const onTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && tags.length) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const submit = (values: FormValues) => {
    if (CHOICE_TYPES.includes(values.type)) {
      const filled = values.options.filter((o) => o.text.trim());
      if (filled.length < 2) {
        setError('options', {
          type: 'manual',
          message: 'Add at least 2 options',
        });
        return;
      }
    }
    clearErrors('options');

    const body: Record<string, unknown> = {
      title: values.title.trim(),
      description: values.description?.trim() || undefined,
      coverImage: values.coverImage?.trim() || undefined,
      type: values.type,
      visibility: values.visibility,
      categoryId:
        values.categoryId && values.categoryId !== NO_CATEGORY
          ? values.categoryId
          : undefined,
      tags: tags.length ? tags : undefined,
      expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : undefined,
      allowMultiple: CHOICE_TYPES.includes(values.type) ? values.allowMultiple : false,
      oneVotePerIp: values.oneVotePerIp,
      requireLogin: values.requireLogin,
      commentsDisabled: values.commentsDisabled,
    };

    if (CHOICE_TYPES.includes(values.type)) {
      body.options = values.options
        .filter((o) => o.text.trim())
        .map((o, i) => ({
          text: o.text.trim(),
          imageUrl: values.type === 'IMAGE_CHOICE' ? o.imageUrl?.trim() || undefined : undefined,
          order: i,
        }));
    }

    onSubmit(body);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      {/* Basics */}
      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
          <CardDescription>The essentials people will see first.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input id="title" placeholder="What should we ask?" {...register('title')} />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Add context for your poll (optional)"
              {...register('description')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverImage">Cover image URL</Label>
            <Input
              id="coverImage"
              placeholder="https://…"
              {...register('coverImage')}
            />
            {errors.coverImage && (
              <p className="text-sm text-destructive">{errors.coverImage.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Type & options */}
      <Card>
        <CardHeader>
          <CardTitle>Poll type</CardTitle>
          <CardDescription>How people will respond.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POLL_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {POLL_TYPE_LABELS[t] ?? t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {!isChoice && (
              <p className="text-xs text-muted-foreground">
                Options are generated automatically for this poll type.
              </p>
            )}
          </div>

          {isChoice && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Options</Label>
                <span className="text-xs text-muted-foreground">Minimum 2</span>
              </div>
              <div className="space-y-3">
                {fields.map((f, i) => (
                  <div
                    key={f.id}
                    className="rounded-lg border bg-muted/30 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder={`Option ${i + 1}`}
                          {...register(`options.${i}.text` as const)}
                        />
                        {isImageChoice && (
                          <Input
                            placeholder="Image URL (optional)"
                            {...register(`options.${i}.imageUrl` as const)}
                          />
                        )}
                        {errors.options?.[i]?.text && (
                          <p className="text-sm text-destructive">
                            {errors.options[i]?.text?.message}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={i === 0}
                          onClick={() => swap(i, i - 1)}
                          aria-label="Move up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={i === fields.length - 1}
                          onClick={() => swap(i, i + 1)}
                          aria-label="Move down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={fields.length <= 2}
                          onClick={() => remove(i)}
                          aria-label="Remove option"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ text: '', imageUrl: '' })}
              >
                <Plus className="h-4 w-4" />
                Add option
              </Button>
              {typeof errors.options?.message === 'string' && (
                <p className="text-sm text-destructive">{errors.options.message}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Organization */}
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Help people discover your poll.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY}>None</SelectItem>
                      {(categories ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.icon ? `${c.icon} ${c.name}` : c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Visibility</Label>
              <Controller
                control={control}
                name="visibility"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v as Visibility)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLIC">Public</SelectItem>
                      <SelectItem value="PRIVATE">Private</SelectItem>
                      <SelectItem value="UNLISTED">Unlisted</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-input bg-background p-2">
              {tags.map((t) => (
                <Badge key={t} variant="secondary" className="gap-1">
                  {t}
                  <button
                    type="button"
                    onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                    className="ml-0.5 rounded-full hover:text-destructive"
                    aria-label={`Remove ${t}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={onTagKeyDown}
                onBlur={() => addTag(tagInput)}
                placeholder={tags.length ? '' : 'Type a tag and press Enter'}
                className="flex-1 min-w-[8rem] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresAt">Closes at</Label>
            <Input id="expiresAt" type="datetime-local" {...register('expiresAt')} />
            <p className="text-xs text-muted-foreground">
              Leave empty to keep the poll open indefinitely.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Fine-tune how voting works.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {isChoice && (
            <>
              <ToggleRow
                control={control}
                name="allowMultiple"
                label="Allow multiple selections"
                hint="Voters can pick more than one option."
              />
              <Separator />
            </>
          )}
          <ToggleRow
            control={control}
            name="oneVotePerIp"
            label="One vote per IP"
            hint="Limit repeat voting from the same network."
          />
          <Separator />
          <ToggleRow
            control={control}
            name="requireLogin"
            label="Require login to vote"
            hint="Only signed-in users can participate."
          />
          <Separator />
          <ToggleRow
            control={control}
            name="commentsDisabled"
            label="Disable comments"
            hint="Turn off the discussion thread."
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={submitting} size="lg">
          {submitting
            ? 'Saving…'
            : mode === 'create'
              ? 'Create Poll'
              : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}

function ToggleRow({
  control,
  name,
  label,
  hint,
}: {
  control: ReturnType<typeof useForm<FormValues>>['control'];
  name: 'allowMultiple' | 'oneVotePerIp' | 'requireLogin' | 'commentsDisabled';
  label: string;
  hint?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-3')}>
      <div className="space-y-0.5">
        <Label htmlFor={name}>{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Switch id={name} checked={field.value} onCheckedChange={field.onChange} />
        )}
      />
    </div>
  );
}
