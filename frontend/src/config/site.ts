/**
 * The product name lives here only. Change it in this one place; the
 * wordmark, page titles and copy all read from it. The tagline and
 * description are translated text: see `meta` in messages/<locale>.json.
 */
export const SITE_NAME = 'Marketplace';

/** Public origin of this web app: canonical links, link previews, sitemap. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);

/** Backend as the browser sees it: images live under BACKEND_URL/uploads. */
export const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001').replace(
  /\/$/,
  '',
);
