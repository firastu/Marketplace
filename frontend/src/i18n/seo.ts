import type { Metadata } from 'next';
import { SITE_URL } from '@/config/site';
import { DEFAULT_LOCALE, type Locale } from './config';

/** "/listings/1" → "/en/listings/1" for English; Arabic has no prefix. */
export function localePath(locale: Locale, path: string): string {
  const clean = path === '/' ? '' : path;
  return locale === DEFAULT_LOCALE ? clean || '/' : `/${locale}${clean}`;
}

export function absoluteUrl(locale: Locale, path: string): string {
  const p = localePath(locale, path);
  return p === '/' ? SITE_URL : `${SITE_URL}${p}`;
}

/** Both language versions of a path, as hreflang wants them. */
export function languageUrls(path: string): Record<string, string> {
  return {
    ar: absoluteUrl('ar', path),
    en: absoluteUrl('en', path),
    'x-default': absoluteUrl(DEFAULT_LOCALE, path),
  };
}

/** Canonical URL of this language plus hreflang links to both. */
export function alternates(locale: Locale, path: string): NonNullable<Metadata['alternates']> {
  return { canonical: absoluteUrl(locale, path), languages: languageUrls(path) };
}

export const OG_LOCALE: Record<Locale, string> = { ar: 'ar_SY', en: 'en_US' };

/** Pages that must stay out of search engines (account, reset, admin…). */
export const NO_INDEX: Metadata['robots'] = { index: false, follow: false };

/** One line of plain text for a description tag. */
export function excerpt(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** JSON-LD must not be able to close its own <script> tag. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
