import { defineRouting } from 'next-intl/routing';
import { DEFAULT_LOCALE, LOCALES } from './config';

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  // Arabic keeps the existing URLs; only English gets a prefix (/en/…).
  localePrefix: 'as-needed',
  // Remembers an explicit language choice for a year.
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
});
