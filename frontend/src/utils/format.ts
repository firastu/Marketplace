export const CURRENCIES = [
  { value: 'SYP', label: 'Syrian pound (SYP)' },
  { value: 'USD', label: 'US dollar (USD)' },
] as const;

export type Currency = (typeof CURRENCIES)[number]['value'];

/**
 * "SYP 5,500", "$650", "$12.50", or "Free" for 0. Syrian pound prices are
 * shown without decimals; the old `toFixed(2)` printed "5500.00".
 */
export function formatPrice(price: number | string, currency: string): string {
  const amount = Number(price);
  if (!Number.isFinite(amount)) return '';
  if (amount === 0) return 'Free';
  const decimals = currency === 'SYP' || Number.isInteger(amount) ? 0 : 2;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: currency === 'USD' ? 'symbol' : 'code',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('en-US')} ${currency}`;
  }
}
