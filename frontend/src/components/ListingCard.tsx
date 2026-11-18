import Link from 'next/link';
import { ImageOff, MapPin } from 'lucide-react';
import { getImageSrcSet, getImageUrl, getPrimaryImage, Listing } from '@/services/listings.service';
import { statusLabel, timeAgo } from '@/utils/format';
import { Price } from './bits';
import { FavoriteButton } from './FavoriteButton';
import styles from './ListingCard.module.css';

interface Props {
  listing: Listing;
  /** Load the photo eagerly (first row of the first page). */
  priority?: boolean;
}

export function ListingCard({ listing, priority }: Props) {
  const image = getPrimaryImage(listing.images ?? []);
  const unavailable = listing.status !== 'active';

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        {image ? (
          <img
            src={getImageUrl(image, 'thumb')}
            srcSet={getImageSrcSet(image)}
            sizes="(min-width: 1024px) 280px, (min-width: 640px) 33vw, 50vw"
            alt=""
            width={image.width ?? 4}
            height={image.height ?? 3}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className={unavailable ? styles.dimmed : undefined}
          />
        ) : (
          <span className={styles.placeholder}>
            <ImageOff aria-hidden="true" />
            <span className="visually-hidden">No photo</span>
          </span>
        )}
        {unavailable && <span className={styles.ribbon}>{statusLabel(listing.status)}</span>}
      </div>

      <div className={styles.body}>
        <Price price={listing.price} currency={listing.currency} className={styles.price} />
        <h3 className={`${styles.title} clamp-2`} dir="auto">
          <Link href={`/listings/${listing.id}`} className={styles.link}>
            {listing.title}
          </Link>
        </h3>
        <p className={styles.meta}>
          {listing.locationCity && (
            <span className={styles.place}>
              <MapPin aria-hidden="true" />
              <span className="clamp-1" dir="auto">
                {listing.locationCity}
              </span>
            </span>
          )}
          <time dateTime={listing.createdAt}>{timeAgo(listing.createdAt)}</time>
        </p>
      </div>

      <div className={styles.fav}>
        <FavoriteButton listingId={listing.id} title={listing.title} />
      </div>
    </article>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={`${styles.media} skeleton`} />
      <div className={styles.body}>
        <span className={`skeleton ${styles.skPrice}`} />
        <span className={`skeleton ${styles.skTitle}`} />
        <span className={`skeleton ${styles.skMeta}`} />
      </div>
    </div>
  );
}

export function ListingGrid({ children }: { children: React.ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

export function ListingGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={styles.grid} aria-busy="true" aria-label="Loading listings">
      {Array.from({ length: count }, (_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}
