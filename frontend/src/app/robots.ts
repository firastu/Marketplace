import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/config/site';
import { LOCALES } from '@/i18n/config';
import { localePath } from '@/i18n/seo';

/** Personal, account and moderation pages: nothing there for a crawler. */
const PRIVATE_PATHS = [
  '/account',
  '/admin',
  '/messages',
  '/favorites',
  '/listings/my',
  '/listings/create',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          // Both languages: /account and /en/account.
          ...LOCALES.flatMap((locale) => PRIVATE_PATHS.map((path) => localePath(locale, path))),
          // Edit pages: /listings/<id>/edit.
          '/*/edit$',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
