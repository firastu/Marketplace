import 'server-only';

/**
 * Calls from the Next.js server to the backend (server-rendered pages, the
 * sitemap). They are always guest requests: no visitor token is available
 * on the server, so drafts and removed listings answer 404 here.
 *
 * INTERNAL_API_KEY lets these calls skip the per-IP rate limit (otherwise
 * every visitor would share the web server's address). This file is
 * server-only: the key must never reach the browser.
 */
const BACKEND_INTERNAL_URL = (process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001').replace(
  /\/$/,
  '',
);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

interface ServerApiOptions {
  /** Seconds the answer may be reused; omitted = always fresh. */
  revalidate?: number;
  timeoutMs?: number;
}

/**
 * GET `/api${path}`. Returns null when the backend says no (404, 400…) or
 * cannot be reached: the page then falls back to loading in the browser,
 * which has the visitor's token and shows proper error states.
 */
export async function serverApi<T>(path: string, options: ServerApiOptions = {}): Promise<T | null> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const key = process.env.INTERNAL_API_KEY;
  if (key) headers['X-Internal-Key'] = key;

  try {
    const res = await fetch(`${BACKEND_INTERNAL_URL}/api${path}`, {
      headers,
      signal: AbortSignal.timeout(options.timeoutMs ?? 5000),
      ...(options.revalidate === undefined
        ? { cache: 'no-store' as const }
        : { next: { revalidate: options.revalidate } }),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
