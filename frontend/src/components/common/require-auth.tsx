'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { PageLoading } from './loading';

/**
 * Client-side gate for authenticated pages. Redirects to /login (preserving
 * the intended destination) once the persisted auth state has hydrated.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, hydrated } = useAuthStore();

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, accessToken, pathname, router]);

  if (!hydrated) return <PageLoading label="Loading…" />;
  if (!accessToken) return <PageLoading label="Redirecting…" />;
  return <>{children}</>;
}
