import { BadgeCheck, Star } from 'lucide-react';
import { initials, priceParts, statusLabel, statusTone } from '@/utils/format';

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
  const p = priceParts(price, currency);
  const cls = ['price', p.free && 'price--free', className].filter(Boolean).join(' ');
  if (p.free || !p.unit) return <span className={cls}>{p.amount}</span>;
  // Numbers stay left-to-right inside right-to-left text.
  return (
    <span className={cls} dir="ltr">
      {p.unitFirst ? (
        <>
          {p.unit}
          {p.amount}
        </>
      ) : (
        <>
          {p.amount} <span className="price__unit">{p.unit}</span>
        </>
      )}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone = statusTone(status);
  return (
    <span className={tone === 'neutral' ? 'badge' : `badge badge--${tone}`}>
      {statusLabel(status)}
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
  return (
    <span className="badge badge--info">
      <BadgeCheck aria-hidden="true" />
      Verified
    </span>
  );
}

export function RatingSummary({ average, count }: { average: number; count: number }) {
  if (count === 0) return <span className="muted">No reviews yet</span>;
  return (
    <span className="rating">
      <Star aria-hidden="true" className="rating__star" />
      <strong>{average.toFixed(1)}</strong>
      <span className="muted">
        ({count} review{count === 1 ? '' : 's'})
      </span>
    </span>
  );
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="stars" role="img" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden="true" data-on={n <= Math.round(value)} />
      ))}
    </span>
  );
}
