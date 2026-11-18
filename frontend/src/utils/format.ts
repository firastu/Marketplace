export const CURRENCIES = [
  { value: 'SYP', label: 'Syrian pound (SYP)' },
  { value: 'USD', label: 'US dollar (USD)' },
] as const;

export type Currency = (typeof CURRENCIES)[number]['value'];

export const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like new' },
  { value: 'used', label: 'Used' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'For parts / poor' },
] as const;

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
] as const;

/** Syrian governorate capitals, offered as suggestions for the city field. */
export const CITIES = [
  'Damascus',
  'Aleppo',
  'Homs',
  'Hama',
  'Latakia',
  'Tartus',
  'Idlib',
  'Daraa',
  'As-Suwayda',
  'Deir ez-Zor',
  'Raqqa',
  'Al-Hasakah',
  'Qamishli',
  'Quneitra',
];

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  active: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
  expired: 'Expired',
  removed: 'Removed',
};

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

const STATUS_TONES: Record<string, Tone> = {
  active: 'success',
  reserved: 'warning',
  sold: 'neutral',
  draft: 'info',
  expired: 'neutral',
  removed: 'danger',
};

/** "like_new" → "Like new". Unknown values are humanised, never shown raw. */
function humanise(value: string): string {
  const spaced = value.replace(/[_-]+/g, ' ').trim();
  return spaced ? spaced[0].toUpperCase() + spaced.slice(1) : '';
}

export function conditionLabel(condition: string | null | undefined): string {
  if (!condition) return '';
  return CONDITIONS.find((c) => c.value === condition)?.label ?? humanise(condition);
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? humanise(status);
}

export function statusTone(status: string): Tone {
  return STATUS_TONES[status] ?? 'neutral';
}

/** Amount and currency as separate parts, so the UI can style them. */
export function priceParts(
  price: number | string,
  currency: string,
): { free: boolean; amount: string; unit: string; unitFirst: boolean } {
  const amount = Number(price);
  if (!Number.isFinite(amount)) return { free: false, amount: '', unit: '', unitFirst: false };
  if (amount === 0) return { free: true, amount: 'Free', unit: '', unitFirst: false };
  const decimals = currency === 'SYP' || Number.isInteger(amount) ? 0 : 2;
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return currency === 'USD'
    ? { free: false, amount: formatted, unit: '$', unitFirst: true }
    : { free: false, amount: formatted, unit: currency, unitFirst: false };
}

/** "$650", "1,500,000 SYP", or "Free" for 0. */
export function formatPrice(price: number | string, currency: string): string {
  const p = priceParts(price, currency);
  if (p.free || !p.unit) return p.amount;
  return p.unitFirst ? `${p.unit}${p.amount}` : `${p.amount} ${p.unit}`;
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** "3 hours ago", "yesterday", "just now". */
export function timeAgo(date: string | Date): string {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000;
  if (!Number.isFinite(seconds)) return '';
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/** Day heading in a chat: "Today", "Yesterday", "Monday", "12 March 2026". */
export function dayLabel(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  if (sameDay(d, now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'Yesterday';
  if (now.getTime() - d.getTime() < 6 * 24 * 3600 * 1000) {
    return d.toLocaleDateString('en', { weekday: 'long' });
  }
  return d.toLocaleDateString('en', {
    day: 'numeric',
    month: 'long',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

export function dayKey(date: string | Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function clockTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
}

/** Inbox timestamp: time today, otherwise a short date. */
export function shortWhen(date: string | Date): string {
  const d = new Date(date);
  if (sameDay(d, new Date())) return clockTime(d);
  return d.toLocaleDateString('en', { day: 'numeric', month: 'short' });
}

export function memberSince(date: string | Date): string {
  return new Date(date).toLocaleDateString('en', { month: 'long', year: 'numeric' });
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
