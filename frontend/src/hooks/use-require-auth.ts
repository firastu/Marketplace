'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/hooks/use-auth';

/** Only same-site paths are accepted as a post-login destination. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
    ? next
    : '/';
}

export function loginHref(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}

/**
 * For pages that need an account: sends guests to the login page and
 * brings them back here afterwards.
 */
export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      const query = typeof window === 'undefined' ? '' : window.location.search;
      router.replace(loginHref(`${pathname}${query}`));
    }
  }, [auth.loading, auth.user, router, pathname]);

  return auth;
}
