import Link from 'next/link';
import { Compass, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 text-center">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-transparent blur-3xl" />
      </div>

      <p className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-8xl font-extrabold tracking-tight text-transparent sm:text-9xl">
        404
      </p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">This page took a wrong turn</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        We couldn&apos;t find the page you were looking for. It may have been moved, closed, or never
        existed.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" asChild>
          <Link href="/">
            <Home className="h-4 w-4" />
            Go home
          </Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/explore">
            <Compass className="h-4 w-4" />
            Explore polls
          </Link>
        </Button>
      </div>
    </div>
  );
}
