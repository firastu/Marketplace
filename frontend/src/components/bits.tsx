import { BadgeCheck, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFormat } from '@/i18n/use-format';
import { initials, statusTone } from '@/utils/format';

/** Small presentational pieces shared by several pages. */

export function Price({
  price,
  currency,
  className,
}: {
  price: number | string;
  currency: string;
  className?: string;
}) {
  const p = useFormat().price(price, currency);
  if (!p) return null;
  if (p.free) return <span className={`price price--free ${className ?? ''}`}>{p.text}</span>;
  // The wrapper follows the page direction, so "ل.س" sits after the amount
  // for an Arabic reader; the digits themselves are isolated left-to-right
  // and never get reordered by the surrounding right-to-left text.
  return (
    <span className={`price ${className ?? ''}`}>
      {p.unitFirst ? (
        <bdi dir="ltr">
          {p.unit}
          {p.amount}
        </bdi>
      ) : (
        <>
          <bdi dir="ltr">{p.amount}</bdi> <span className="price__unit">{p.unit}</span>
        </>
      )}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const fmt = useFormat();
  const tone = statusTone(status);
  return (
    <span className={tone === 'neutral' ? 'badge' : `badge badge--${tone}`}>
      {fmt.status(status)}
    </span>
  );
}

export function Avatar({
  name,
  size,
}: {
  name: string | null | undefined;
  size?: 'sm' | 'lg';
}) {
  return (
    <span className={size ? `avatar avatar--${size}` : 'avatar'} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function VerifiedBadge() {
  const t = useTranslations('bits');
  return (
    <span className="badge badge--info">
      <BadgeCheck aria-hidden="true" />
      {t('verified')}
    </span>
  );
}

export function RatingSummary({ average, count }: { average: number; count: number }) {
  const t = useTranslations('bits');
  const fmt = useFormat();
  if (count === 0) return <span className="muted">{t('noReviews')}</span>;
  return (
    <span className="rating">
      <Star aria-hidden="true" className="rating__star" />
      <strong>
        {fmt.number(average, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
      </strong>
      <span className="muted">{t('reviewCount', { count, n: fmt.number(count) })}</span>
    </span>
  );
}

export function Stars({ value }: { value: number }) {
  const t = useTranslations('bits');
  return (
    <span className="stars" role="img" aria-label={t('stars', { value: String(value) })}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden="true" data-on={n <= Math.round(value)} />
      ))}
    </span>
  );
}
