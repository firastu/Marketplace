/**
 * Everything locale-specific that is not a translated sentence lives here:
 * the list of languages, text direction and how numbers and dates look.
 */
export const LOCALES = ['ar', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** Arabic is served at the bare paths (/listings/…), English under /en. */
export const DEFAULT_LOCALE: Locale = 'ar';

/**
 * THE SWITCH for digits in the Arabic interface.
 *   'latn' → 0123456789 (what Syrian users type and read on price tags)
 *   'arab' → ٠١٢٣٤٥٦٧٨٩
 * Prices, counts, dates and times all follow it.
 */
export const ARABIC_DIGITS: 'latn' | 'arab' = 'latn';

/**
 * BCP 47 tags handed to Intl.*. ar-SY gives Levantine month names
 * (كانون الثاني, شباط, …) and the Gregorian calendar.
 */
export const INTL_LOCALE: Record<Locale, string> = {
  ar: `ar-SY-u-nu-${ARABIC_DIGITS}`,
  en: 'en',
};

export const DIRECTION: Record<Locale, 'rtl' | 'ltr'> = { ar: 'rtl', en: 'ltr' };

/** Each language's own name, for the language switcher. */
export const LOCALE_NAMES: Record<Locale, string> = { ar: 'العربية', en: 'English' };

/** Short form for tight spots (the phone header). */
export const LOCALE_SHORT_NAMES: Record<Locale, string> = { ar: 'عربي', en: 'EN' };

export function isLocale(value: string | undefined | null): value is Locale {
  return (LOCALES as readonly string[]).includes(value ?? '');
}
