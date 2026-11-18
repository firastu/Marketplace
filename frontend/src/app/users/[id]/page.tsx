'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MessageSquareText, Store, UserRoundX } from 'lucide-react';
import { getListings, Listing, PublicUser } from '@/services/listings.service';
import { getUser, getUserRating, getUserReviews, Rating, Review } from '@/services/users.service';
import { memberSince, timeAgo } from '@/utils/format';
import { Avatar, RatingSummary, Stars, VerifiedBadge } from '@/components/bits';
import { ListingCard, ListingGrid, ListingGridSkeleton } from '@/components/ListingCard';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { errorText } from '@/components/ui/Feedback';
import styles from './page.module.css';

interface Profile {
  user: PublicUser;
  rating: Rating;
  reviews: Review[];
  listings: Listing[];
  totalListings: number;
}

type State = Profile | { error: string } | null;

export default function SellerPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<State>(null);
  const [tab, setTab] = useState<'listings' | 'reviews'>('listings');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([
      getUser(id),
      getUserRating(id).catch(() => ({ average: 0, count: 0 })),
      getUserReviews(id).catch(() => []),
      getListings({ userId: id, limit: 40 }).catch(() => null),
    ])
      .then(([user, rating, reviews, listings]) => {
        if (cancelled) return;
        document.title = user.displayName || user.username;
        setState({
          user,
          rating,
          reviews,
          listings: listings?.data ?? [],
          totalListings: listings?.meta.total ?? 0,
        });
      })
      .catch((err) => !cancelled && setState({ error: errorText(err, 'Could not load') }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state === null) {
    return (
      <div className="container page" aria-busy="true" aria-label="Loading profile">
        <div className={`skeleton ${styles.skeleton}`} />
        <ListingGridSkeleton count={4} />
      </div>
    );
  }

  if ('error' in state) {
    return (
      <div className="container page">
        <EmptyState
          icon={UserRoundX}
          title="Seller not found"
          actions={
            <Link href="/" className={buttonClass({ variant: 'primary' })}>
              Browse listings
            </Link>
          }
        >
          {state.error}
        </EmptyState>
      </div>
    );
  }

  const { user, rating, reviews, listings, totalListings } = state;
  const name = user.displayName || user.username;

  return (
    <div className="container page">
      <section className={`card ${styles.profile}`}>
        <div className="ablaq" aria-hidden="true" />
        <div className={styles.profileBody}>
          <Avatar name={name} size="lg" />
          <div className={styles.profileText}>
            <h1 className={styles.name} dir="auto">
              {name}
            </h1>
            <p className="muted">@{user.username}</p>
            <div className={styles.meta}>
              {user.isVerified && <VerifiedBadge />}
              <RatingSummary average={rating.average} count={rating.count} />
              {user.createdAt && (
                <span className="muted">Member since {memberSince(user.createdAt)}</span>
              )}
            </div>
            {user.bio && (
              <p className={styles.bio} dir="auto">
                {user.bio}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="tabs" role="tablist" aria-label="Seller content">
        <button
          type="button"
          role="tab"
          className="tab"
          aria-selected={tab === 'listings'}
          onClick={() => setTab('listings')}
        >
          Listings <span className="tab__count">{totalListings}</span>
        </button>
        <button
          type="button"
          role="tab"
          className="tab"
          aria-selected={tab === 'reviews'}
          onClick={() => setTab('reviews')}
        >
          Reviews <span className="tab__count">{reviews.length}</span>
        </button>
      </div>

      {tab === 'listings' &&
        (listings.length > 0 ? (
          <ListingGrid>
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </ListingGrid>
        ) : (
          <EmptyState icon={Store} title="No listings right now">
            {name} has nothing for sale at the moment.
          </EmptyState>
        ))}

      {tab === 'reviews' &&
        (reviews.length > 0 ? (
          <ul className={styles.reviews}>
            {reviews.map((review) => {
              const reviewer = review.reviewer?.displayName || review.reviewer?.username || 'User';
              return (
                <li key={review.id} className={`card card--pad ${styles.review}`}>
                  <div className={styles.reviewHead}>
                    <Avatar name={reviewer} size="sm" />
                    <div className={styles.reviewWho}>
                      <span className={styles.reviewer} dir="auto">
                        {reviewer}
                      </span>
                      <span className="muted">{timeAgo(review.createdAt)}</span>
                    </div>
                    <Stars value={review.rating} />
                  </div>
                  {review.title && (
                    <p className={styles.reviewTitle} dir="auto">
                      {review.title}
                    </p>
                  )}
                  {review.body && <p dir="auto">{review.body}</p>}
                  {review.listing && (
                    <p className="muted" dir="auto">
                      About: {review.listing.title}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={MessageSquareText} title="No reviews yet">
            Buyers and sellers can review each other after chatting about a listing.
          </EmptyState>
        ))}
    </div>
  );
}
