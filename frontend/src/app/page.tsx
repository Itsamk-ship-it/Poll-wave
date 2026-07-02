'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  BarChart3,
  LayoutList,
  MessageSquare,
  QrCode,
  ShieldCheck,
  Vote,
  ArrowRight,
} from 'lucide-react';
import { pollsApi } from '@/lib/services';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { PollCard } from '@/components/poll/poll-card';
import { PollCardSkeleton } from '@/components/poll/poll-card-skeleton';

const FEATURES = [
  {
    icon: Activity,
    title: 'Real-time results',
    description: 'Watch votes stream in live over websockets — no refresh needed.',
  },
  {
    icon: LayoutList,
    title: 'Multiple poll types',
    description: 'Single & multiple choice, yes/no, ratings, emoji reactions and image polls.',
  },
  {
    icon: ShieldCheck,
    title: 'Anonymous voting',
    description: 'Let anyone vote without an account, with one-vote-per-IP protection.',
  },
  {
    icon: BarChart3,
    title: 'Rich analytics',
    description: 'Break down votes, views and conversion with beautiful charts.',
  },
  {
    icon: QrCode,
    title: 'Share & embed',
    description: 'Copy links, generate QR codes, and embed polls anywhere.',
  },
  {
    icon: MessageSquare,
    title: 'Comments',
    description: 'Spark discussion with threaded, likeable comments on every poll.',
  },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['polls', 'trending-home'],
    queryFn: () => pollsApi.list({ sort: 'popular', limit: 6 }),
  });

  const trending = data?.data ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
              <Vote className="h-5 w-5" />
            </span>
            <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-lg font-bold text-transparent">
              PollWave
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link href="/explore">Explore</Link>
            </Button>
            {isAuthenticated ? (
              <Button asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Sign up</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-transparent blur-3xl" />
        </div>
        <div className="container flex flex-col items-center py-20 text-center md:py-28">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card/60 px-4 py-1.5 text-sm text-muted-foreground">
            <Activity className="h-3.5 w-3.5 text-primary" />
            Live results, updated in real time
          </span>
          <h1 className="max-w-3xl text-balance text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            Create polls.{' '}
            <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
              Collect votes.
            </span>{' '}
            See results live.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg text-muted-foreground">
            PollWave is the fastest way to build interactive polls, share them anywhere, and watch
            the results roll in — instantly.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href={isAuthenticated ? '/create' : '/register'}>
                Create a poll
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/explore">Explore polls</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Everything you need to run great polls</h2>
          <p className="mt-3 text-muted-foreground">
            Powerful, flexible and delightful — from a quick straw poll to a full survey.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group rounded-xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trending */}
      <section className="container py-16 md:py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Trending polls</h2>
            <p className="mt-2 text-muted-foreground">See what the community is voting on right now.</p>
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link href="/explore">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <PollCardSkeleton key={i} />
            ))}
          </div>
        ) : trending.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/40 px-6 py-16 text-center">
            <p className="text-muted-foreground">No polls yet — be the first to create one!</p>
            <Button className="mt-4" asChild>
              <Link href={isAuthenticated ? '/create' : '/register'}>Create a poll</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trending.map((poll) => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t">
        <div className="container flex flex-col items-center justify-between gap-4 py-8 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
              <Vote className="h-3.5 w-3.5" />
            </span>
            PollWave &copy; {new Date().getFullYear()}
          </div>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/explore" className="hover:text-foreground">
              Explore
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
            <Link href="/register" className="hover:text-foreground">
              Sign up
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
