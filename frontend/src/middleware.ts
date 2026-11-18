import { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const handle = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // Arabic-first: a first visit is always Arabic, whatever language the
  // browser or phone is set to (many Syrian phones run in English). Only
  // the URL (/en/…) and the visitor's own earlier choice (cookie) count,
  // so the Accept-Language header is taken out of the decision.
  const headers = new Headers(request.headers);
  headers.delete('accept-language');
  return handle(new NextRequest(request, { headers }));
}

export const config = {
  // Pages only: not the /api proxy, Next.js internals or files (favicon.ico…).
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
