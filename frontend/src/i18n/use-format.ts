import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import * as f from '@/utils/format';

function includes<T extends string>(list: readonly T[], value: string): value is T {
  return (list as readonly string[]).includes(value);
}

/** A category as the API sends it: English `name`, optional Arabic `nameAr`. */
interface NamedCategory {
  name: string;
  nameAr?: string | null;
}

/**
 * Everything a component needs to show a number, price, date, enum label,
 * category or city in the current language. One hook, so no component
 * formats on its own.
 */
export function useFormat() {
  const locale = useLocale();
  const t = useTranslations('format');

  return useMemo(
    () => ({
      locale,
      /** 1234 → "1,234". Also use it for numbers placed inside messages. */
      number: (value: number, options?: Intl.NumberFormatOptions) =>
        f.formatNumber(value, locale, options),
      /** Parts of a price; `unit` is "ل.س" / "SYP" / "$". */
      price(price: number | string, currency: string) {
        const amount = f.priceAmount(price, currency, locale);
        if (!amount) return null;
        if (amount.free) return { free: true as const, text: t('free') };
        return {
          free: false as const,
          amount: amount.amount,
          unit: includes(f.CURRENCIES, currency) ? t(`unit.${currency}`) : currency,
          unitFirst: currency === 'USD',
        };
      },
      currencyUnit: (currency: string) =>
        includes(f.CURRENCIES, currency) ? t(`unit.${currency}`) : currency,
      currencyName: (currency: f.Currency) => t(`currency.${currency}`),
      condition: (value: string | null | undefined) =>
        !value ? '' : includes(f.CONDITIONS, value) ? t(`condition.${value}`) : f.humanise(value),
      status: (value: string) =>
        includes(f.STATUSES, value) ? t(`status.${value}`) : f.humanise(value),
      sort: (value: (typeof f.SORT_OPTIONS)[number]) => t(`sort.${value}`),
      /** Arabic name in Arabic when the category has one, else `name`. */
      category: (category: NamedCategory) =>
        (locale === 'ar' && category.nameAr) || category.name,
      city: (city: string) => f.cityLabel(city, locale),
      cities: f.CITIES.map((c) => c[locale]),
      timeAgo: (date: string | Date) => f.timeAgo(date, locale) ?? t('justNow'),
      dayLabel(date: string | Date) {
        const label = f.dayLabel(date, locale);
        return label === 'today' || label === 'yesterday' ? t(label) : label;
      },
      clockTime: (date: string | Date) => f.clockTime(date, locale),
      shortWhen: (date: string | Date) => f.shortWhen(date, locale),
      memberSince: (date: string | Date) => f.memberSince(date, locale),
    }),
    [locale, t],
  );
}
