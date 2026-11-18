import { INTL_LOCALE, Locale } from '@/i18n/config';

/**
 * Pure, locale-aware formatting. Numbers, prices and dates all go through
 * here, so how they look is decided by INTL_LOCALE in src/i18n/config.ts
 * (including the Arabic digits switch). Components use these through the
 * useFormat() hook, which also adds the translated labels.
 */

export const CURRENCIES = ['SYP', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CONDITIONS = ['new', 'like_new', 'used', 'fair', 'poor'] as const;
export type Condition = (typeof CONDITIONS)[number];

export const STATUSES = ['draft', 'active', 'reserved', 'sold', 'expired', 'removed'] as const;
export type Status = (typeof STATUSES)[number];

export const SORT_OPTIONS = ['newest', 'price_asc', 'price_desc'] as const;

/** Syrian governorate capitals, offered as suggestions for the city field. */
export const CITIES: readonly Record<Locale, string>[] = [
  { en: 'Damascus', ar: 'دمشق' },
  { en: 'Aleppo', ar: 'حلب' },
  { en: 'Homs', ar: 'حمص' },
  { en: 'Hama', ar: 'حماة' },
  { en: 'Latakia', ar: 'اللاذقية' },
  { en: 'Tartus', ar: 'طرطوس' },
  { en: 'Idlib', ar: 'إدلب' },
  { en: 'Daraa', ar: 'درعا' },
  { en: 'As-Suwayda', ar: 'السويداء' },
  { en: 'Deir ez-Zor', ar: 'دير الزور' },
  { en: 'Raqqa', ar: 'الرقة' },
  { en: 'Al-Hasakah', ar: 'الحسكة' },
  { en: 'Qamishli', ar: 'القامشلي' },
  { en: 'Quneitra', ar: 'القنيطرة' },
];

/**
 * A stored city in the reader's language when it is one of the known
 * cities ("Damascus" ↔ "دمشق"); anything else is shown as the seller typed it.
 */
export function cityLabel(city: string, locale: Locale): string {
  const wanted = city.trim().toLowerCase();
  const known = CITIES.find((c) => c.en.toLowerCase() === wanted || c.ar === wanted);
  return known ? known[locale] : city;
}

/**
 * What is stored and sent to the API for a city. Known cities always use
 * one spelling (the English one), so a listing saved as "دمشق" and a search
 * for "Damascus" still meet; anything else stays as typed.
 */
export function canonicalCity(city: string): string {
  const wanted = city.trim().toLowerCase();
  const known = CITIES.find((c) => c.en.toLowerCase() === wanted || c.ar === wanted);
  return known ? known.en : city.trim();
}

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

const STATUS_TONES: Record<string, Tone> = {
  active: 'success',
  reserved: 'warning',
  sold: 'neutral',
  draft: 'info',
  expired: 'neutral',
  removed: 'danger',
};

export function statusTone(status: string): Tone {
  return STATUS_TONES[status] ?? 'neutral';
}

/** "like_new" → "Like new": for values the app has no label for yet. */
export function humanise(value: string): string {
  const spaced = value.replace(/[_-]+/g, ' ').trim();
  return spaced ? spaced[0].toUpperCase() + spaced.slice(1) : '';
}

export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): string {
  return value.toLocaleString(INTL_LOCALE[locale], options);
}

/**
 * The amount of a price, formatted. `null` when it is not a number;
 * `free` for 0 (shown as "Free" / "مجانًا" by the caller).
 */
export function priceAmount(
  price: number | string,
  currency: string,
  locale: Locale,
): { free: boolean; amount: string } | null {
  const amount = Number(price);
  if (!Number.isFinite(amount)) return null;
  if (amount === 0) return { free: true, amount: '' };
  const decimals = currency === 'SYP' || Number.isInteger(amount) ? 0 : 2;
  return {
    free: false,
    amount: formatNumber(amount, locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
  };
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

const relativeFormats = new Map<Locale, Intl.RelativeTimeFormat>();

/** "3 hours ago" / "قبل 3 ساعات", "yesterday" / "أمس"; `null` for "just now". */
export function timeAgo(date: string | Date, locale: Locale): string | null {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000;
  if (!Number.isFinite(seconds)) return '';
  let rtf = relativeFormats.get(locale);
  if (!rtf) {
    rtf = new Intl.RelativeTimeFormat(INTL_LOCALE[locale], { numeric: 'auto' });
    relativeFormats.set(locale, rtf);
  }
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return null;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/**
 * Day heading in a chat: 'today' / 'yesterday' (translated by the caller),
 * otherwise "Monday" or "12 March 2026" in the reader's language.
 */
export function dayLabel(date: string | Date, locale: Locale): 'today' | 'yesterday' | string {
  const d = new Date(date);
  const now = new Date();
  if (sameDay(d, now)) return 'today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'yesterday';
  if (now.getTime() - d.getTime() < 6 * 24 * 3600 * 1000) {
    return d.toLocaleDateString(INTL_LOCALE[locale], { weekday: 'long' });
  }
  return d.toLocaleDateString(INTL_LOCALE[locale], {
    day: 'numeric',
    month: 'long',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

export function dayKey(date: string | Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function clockTime(date: string | Date, locale: Locale): string {
  return new Date(date).toLocaleTimeString(INTL_LOCALE[locale], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Inbox timestamp: time today, otherwise a short date. */
export function shortWhen(date: string | Date, locale: Locale): string {
  const d = new Date(date);
  if (sameDay(d, new Date())) return clockTime(d, locale);
  return d.toLocaleDateString(INTL_LOCALE[locale], { day: 'numeric', month: 'short' });
}

export function memberSince(date: string | Date, locale: Locale): string {
  return new Date(date).toLocaleDateString(INTL_LOCALE[locale], { month: 'long', year: 'numeric' });
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  // Arabic has no capitals and two joined letters read as a word
  // ("لينا الخطيب" → "لا", i.e. "no"), so an Arabic name gets one letter.
  if (/^[\u0600-\u06FF]/.test(parts[0])) return parts[0][0];
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
