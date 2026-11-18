'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronRight,
  Clock,
  Eye,
  Handshake,
  MapPin,
  MessageCircle,
  Pencil,
  SearchX,
  Share2,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { loginHref } from '@/hooks/use-require-auth';
import { ApiError } from '@/services/api-client';
import {
  deleteListing,
  getListingById,
  Listing,
  OwnerStatus,
  updateListingStatus,
} from '@/services/listings.service';
import { getMyConversations, startConversation } from '@/services/messages.service';
import { getUserRating, Rating } from '@/services/users.service';
import { conditionLabel, memberSince, timeAgo } from '@/utils/format';
import { Avatar, Price, RatingSummary, StatusBadge, VerifiedBadge } from '@/components/bits';
import { FavoriteButton } from '@/components/FavoriteButton';
import { Gallery } from '@/components/Gallery';
import { Button, buttonClass } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { errorText, useConfirm, useToast } from '@/components/ui/Feedback';
import { Field, Textarea } from '@/components/ui/Field';
import styles from './page.module.css';

const QUICK_MESSAGES = [
  'Hi, is this still available?',
  'What is your best price?',
  'Where and when can I see it?',
];

const NEXT_STATUS: Record<string, { status: OwnerStatus; label: string }[]> = {
  active: [
    { status: 'reserved', label: 'Mark as reserved' },
    { status: 'sold', label: 'Mark as sold' },
  ],
  reserved: [
    { status: 'sold', label: 'Mark as sold' },
    { status: 'active', label: 'Make available again' },
  ],
  sold: [{ status: 'active', label: 'Make available again' }],
};

type State = { listing: Listing } | { error: string; notFound: boolean } | null;

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [state, setState] = useState<State>(null);
  const [attempt, setAttempt] = useState(0);
  const [rating, setRating] = useState<Rating | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [message, setMessage] = useState(QUICK_MESSAGES[0]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getListingById(id)
      .then((listing) => {
        if (cancelled) return;
        setState({ listing });
        document.title = listing.title;
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          error: errorText(err, 'Could not load this listing'),
          notFound: err instanceof ApiError && (err.status === 404 || err.status === 400),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const listing = state && 'listing' in state ? state.listing : null;
  const sellerId = listing?.user?.id;
  useEffect(() => {
    if (!sellerId) return;
    let cancelled = false;
    getUserRating(sellerId)
      .then((r) => !cancelled && setRating(r))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  const handleContact = useCallback(async () => {
    if (!listing) return;
    if (!user) {
      router.push(loginHref(`/listings/${listing.id}`));
      return;
    }
    setBusy(true);
    try {
      // Already talking about this listing? Open that chat instead of
      // sending the seller another opening message.
      const existing = (await getMyConversations()).find(
        (c) => c.listingId === listing.id && c.buyerId === user.id,
      );
      if (existing) {
        router.push(`/messages/${existing.id}`);
        return;
      }
      setContactOpen(true);
    } catch (err) {
      toast(errorText(err, 'Could not open the chat'), 'error');
    } finally {
      setBusy(false);
    }
  }, [listing, user, router, toast]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing || !message.trim()) return;
    setBusy(true);
    try {
      const { conversation } = await startConversation(listing.id, message.trim());
      router.push(`/messages/${conversation.id}`);
    } catch (err) {
      toast(errorText(err, 'Could not send your message'), 'error');
      setBusy(false);
    }
  };

  const handleShare = async () => {
    if (!listing) return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: listing.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast('Link copied', 'success');
      }
    } catch {
      // share sheet dismissed
    }
  };

  const handleStatus = async (status: OwnerStatus) => {
    if (!listing) return;
    setBusy(true);
    try {
      const updated = await updateListingStatus(listing.id, status);
      setState({ listing: updated });
      toast('Status updated', 'success');
    } catch (err) {
      toast(errorText(err, 'Could not change the status'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!listing) return;
    const ok = await confirm({
      title: 'Delete this listing?',
      message: 'It disappears from search right away. Your chats about it are kept.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteListing(listing.id);
      toast('Listing deleted', 'success');
      router.push('/listings/my');
    } catch (err) {
      toast(errorText(err, 'Could not delete the listing'), 'error');
    }
  };

  if (state === null) return <DetailSkeleton />;

  if ('error' in state) {
    return (
      <div className="container page">
        {state.notFound ? (
          <EmptyState
            icon={SearchX}
            title="This listing is not available"
            actions={
              <Link href="/" className={buttonClass({ variant: 'primary' })}>
                Browse listings
              </Link>
            }
          >
            It may have been sold and removed, or the link is incomplete.
          </EmptyState>
        ) : (
          <EmptyState
            icon={WifiOff}
            title="Could not load this listing"
            actions={
              <Button
                variant="primary"
                onClick={() => {
                  setState(null);
                  setAttempt((n) => n + 1);
                }}
              >
                Try again
              </Button>
            }
          >
            {state.error}
          </EmptyState>
        )}
      </div>
    );
  }

  const l = state.listing;
  const seller = l.user;
  const sellerName = seller?.displayName || seller?.username || 'Seller';
  const isOwner = !!user && user.id === l.userId;
  const canContact = !isOwner && ['active', 'reserved'].includes(l.status);
  const statusActions = NEXT_STATUS[l.status] ?? [];

  const contactButton = canContact && (
    <Button variant="accent" size="lg" block loading={busy} onClick={handleContact}>
      <MessageCircle aria-hidden="true" />
      Message seller
    </Button>
  );

  return (
    <>
      <div className={`container page ${styles.page}`}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <Link href="/">Browse</Link>
          {l.category && (
            <>
              <ChevronRight aria-hidden="true" className="icon-flip" />
              <Link href={`/?categoryId=${l.category.id}`}>{l.category.name}</Link>
            </>
          )}
        </nav>

        <div className={styles.layout}>
          <div className={styles.main}>
            <Gallery images={l.images ?? []} title={l.title} />

            <section className={styles.summaryMobile}>
              <Summary listing={l} />
            </section>

            <section className={styles.block}>
              <h2 className={styles.blockTitle}>Description</h2>
              <p className={styles.description} dir="auto">
                {l.description}
              </p>
            </section>

            <section className={styles.block}>
              <h2 className={styles.blockTitle}>Details</h2>
              <dl className={styles.details}>
                <div>
                  <dt>Condition</dt>
                  <dd>{conditionLabel(l.condition)}</dd>
                </div>
                {l.category && (
                  <div>
                    <dt>Category</dt>
                    <dd>{l.category.name}</dd>
                  </div>
                )}
                {l.locationCity && (
                  <div>
                    <dt>Location</dt>
                    <dd dir="auto">{l.locationCity}</dd>
                  </div>
                )}
                <div>
                  <dt>Price</dt>
                  <dd>{l.isNegotiable ? 'Negotiable' : 'Fixed'}</dd>
                </div>
              </dl>
            </section>
          </div>

          <aside className={styles.side}>
            <section className={`card card--pad ${styles.summaryDesktop}`}>
              <Summary listing={l} />
            </section>

            <section className={`card card--pad ${styles.actions}`}>
              {isOwner ? (
                <>
                  <p className={styles.ownerNote}>This is your listing</p>
                  <Link
                    href={`/listings/${l.id}/edit`}
                    className={buttonClass({ variant: 'primary', block: true })}
                  >
                    <Pencil aria-hidden="true" />
                    Edit listing and photos
                  </Link>
                  {statusActions.map((a) => (
                    <Button key={a.status} block disabled={busy} onClick={() => handleStatus(a.status)}>
                      {a.label}
                    </Button>
                  ))}
                  <Button variant="ghost" block onClick={handleDelete} className={styles.danger}>
                    <Trash2 aria-hidden="true" />
                    Delete
                  </Button>
                </>
              ) : (
                <>
                  <div className={styles.desktopContact}>{contactButton}</div>
                  {!canContact && (
                    <p className="muted">This item is no longer available for enquiries.</p>
                  )}
                  <div className={styles.secondary}>
                    <FavoriteButton listingId={l.id} title={l.title} variant="button" />
                    <Button onClick={handleShare}>
                      <Share2 aria-hidden="true" />
                      Share
                    </Button>
                  </div>
                </>
              )}
            </section>

            {seller && (
              <section className="card card--pad">
                <h2 className={styles.blockTitle}>Seller</h2>
                <Link href={`/users/${seller.id}`} className={styles.seller}>
                  <Avatar name={sellerName} />
                  <span className={styles.sellerText}>
                    <span className={styles.sellerName} dir="auto">
                      {sellerName}
                    </span>
                    {seller.createdAt && (
                      <span className="muted">Member since {memberSince(seller.createdAt)}</span>
                    )}
                  </span>
                  <ChevronRight aria-hidden="true" className={`icon-flip ${styles.sellerChevron}`} />
                </Link>
                <div className={styles.sellerMeta}>
                  {seller.isVerified && <VerifiedBadge />}
                  {rating && <RatingSummary average={rating.average} count={rating.count} />}
                </div>
              </section>
            )}

            <p className={styles.safety}>
              <Handshake aria-hidden="true" />
              Meet in a public place, check the item before you pay, and never send money in
              advance.
            </p>
          </aside>
        </div>
      </div>

      {canContact && (
        <div className={styles.stickyBar}>
          <Price price={l.price} currency={l.currency} className={styles.stickyPrice} />
          {contactButton}
        </div>
      )}
      {isOwner && (
        <div className={styles.stickyBar}>
          <Link
            href={`/listings/${l.id}/edit`}
            className={buttonClass({ variant: 'primary', size: 'lg', block: true })}
          >
            <Pencil aria-hidden="true" />
            Edit listing
          </Link>
        </div>
      )}

      <Dialog
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        title={`Message ${sellerName}`}
        variant="sheet"
      >
        <form onSubmit={handleSend} className="form">
          <ul className={styles.quick} aria-label="Suggested messages">
            {QUICK_MESSAGES.map((q) => (
              <li key={q}>
                <button
                  type="button"
                  className={`chip ${message === q ? 'chip--active' : ''}`}
                  onClick={() => setMessage(q)}
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
          <Field label="Your message" htmlFor="contact-message">
            <Textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={5000}
              rows={4}
              dir="auto"
              required
            />
          </Field>
          <Button type="submit" variant="accent" size="lg" block loading={busy}>
            Send message
          </Button>
        </form>
      </Dialog>
    </>
  );
}

function Summary({ listing: l }: { listing: Listing }) {
  return (
    <div className={styles.summary}>
      <div className={styles.badges}>
        {l.status !== 'active' && <StatusBadge status={l.status} />}
        <span className="badge">{conditionLabel(l.condition)}</span>
        {l.isNegotiable && Number(l.price) > 0 && (
          <span className="badge badge--accent">Negotiable</span>
        )}
      </div>
      <h1 className={styles.title} dir="auto">
        {l.title}
      </h1>
      <Price price={l.price} currency={l.currency} className={styles.price} />
      <ul className={styles.facts}>
        {l.locationCity && (
          <li>
            <MapPin aria-hidden="true" />
            <span dir="auto">{l.locationCity}</span>
          </li>
        )}
        <li>
          <Clock aria-hidden="true" />
          <time dateTime={l.createdAt}>Posted {timeAgo(l.createdAt)}</time>
        </li>
        <li>
          <Eye aria-hidden="true" />
          {l.viewsCount.toLocaleString('en')} view{l.viewsCount === 1 ? '' : 's'}
        </li>
      </ul>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className={`container page ${styles.page}`} aria-busy="true" aria-label="Loading listing">
      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={`skeleton ${styles.skGallery}`} />
          <div className={`skeleton ${styles.skLine}`} />
          <div className={`skeleton ${styles.skBlock}`} />
        </div>
        <div className={styles.side}>
          <div className={`skeleton ${styles.skBlock}`} />
          <div className={`skeleton ${styles.skBlock}`} />
        </div>
      </div>
    </div>
  );
}
