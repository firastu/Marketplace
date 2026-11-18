'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useErrorText } from '@/i18n/errors';
import { Link, useRouter } from '@/i18n/navigation';
import { useFormat } from '@/i18n/use-format';
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
import { Avatar, Price, RatingSummary, StatusBadge, VerifiedBadge } from '@/components/bits';
import { FavoriteButton } from '@/components/FavoriteButton';
import { Gallery } from '@/components/Gallery';
import { Button, buttonClass } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { useConfirm, useToast } from '@/components/ui/Feedback';
import { Field, Textarea } from '@/components/ui/Field';
import styles from './page.module.css';

const QUICK_MESSAGES = ['available', 'bestPrice', 'whereWhen'] as const;

/** What the owner can do next; the labels are `listing.action.<status>`. */
const NEXT_STATUS: Record<string, OwnerStatus[]> = {
  active: ['reserved', 'sold'],
  reserved: ['sold', 'active'],
  sold: ['active'],
};

type State = { listing: Listing } | { error: unknown; notFound: boolean } | null;

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const t = useTranslations('listing');
  const tf = useTranslations('feedback');
  const tc = useTranslations('common');
  const fmt = useFormat();
  const errorText = useErrorText();

  const [state, setState] = useState<State>(null);
  const [attempt, setAttempt] = useState(0);
  const [rating, setRating] = useState<Rating | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const quickMessages = QUICK_MESSAGES.map((key) => t(`quick.${key}`));
  const [message, setMessage] = useState(quickMessages[0]);
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
          error: err,
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
      toast(errorText(err, t('chatFailed')), 'error');
    } finally {
      setBusy(false);
    }
  }, [listing, user, router, toast, errorText, t]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing || !message.trim()) return;
    setBusy(true);
    try {
      const { conversation } = await startConversation(listing.id, message.trim());
      router.push(`/messages/${conversation.id}`);
    } catch (err) {
      toast(errorText(err, t('sendFailed')), 'error');
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
        toast(tf('linkCopied'), 'success');
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
      toast(tf('statusUpdated'), 'success');
    } catch (err) {
      toast(errorText(err, tf('statusFailed')), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!listing) return;
    const ok = await confirm({
      title: t('deleteTitle'),
      message: t('deleteBody'),
      confirmLabel: tc('delete'),
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteListing(listing.id);
      toast(tf('listingDeleted'), 'success');
      router.push('/listings/my');
    } catch (err) {
      toast(errorText(err, tf('deleteFailed')), 'error');
    }
  };

  if (state === null) return <DetailSkeleton />;

  if ('error' in state) {
    return (
      <div className="container page">
        {state.notFound ? (
          <EmptyState
            icon={SearchX}
            title={t('unavailableTitle')}
            actions={
              <Link href="/" className={buttonClass({ variant: 'primary' })}>
                {tc('browseListings')}
              </Link>
            }
          >
            {t('unavailableBody')}
          </EmptyState>
        ) : (
          <EmptyState
            icon={WifiOff}
            title={t('loadErrorTitle')}
            actions={
              <Button
                variant="primary"
                onClick={() => {
                  setState(null);
                  setAttempt((n) => n + 1);
                }}
              >
                {tc('tryAgain')}
              </Button>
            }
          >
            {errorText(state.error)}
          </EmptyState>
        )}
      </div>
    );
  }

  const l = state.listing;
  const seller = l.user;
  const sellerName = seller?.displayName || seller?.username || t('seller');
  const isOwner = !!user && user.id === l.userId;
  const canContact = !isOwner && ['active', 'reserved'].includes(l.status);
  const statusActions = NEXT_STATUS[l.status] ?? [];

  const contactButton = canContact && (
    <Button variant="accent" size="lg" block loading={busy} onClick={handleContact}>
      <MessageCircle aria-hidden="true" />
      {t('messageSeller')}
    </Button>
  );

  return (
    <>
      <div className={`container page ${styles.page}`}>
        <nav className={styles.crumbs} aria-label={t('breadcrumb')}>
          <Link href="/">{t('home')}</Link>
          {l.category && (
            <>
              <ChevronRight aria-hidden="true" className="icon-flip" />
              <Link href={`/?categoryId=${l.category.id}`}>{fmt.category(l.category)}</Link>
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
              <h2 className={styles.blockTitle}>{t('description')}</h2>
              <p className={styles.description} dir="auto">
                {l.description}
              </p>
            </section>

            <section className={styles.block}>
              <h2 className={styles.blockTitle}>{t('details')}</h2>
              <dl className={styles.details}>
                <div>
                  <dt>{t('condition')}</dt>
                  <dd>{fmt.condition(l.condition)}</dd>
                </div>
                {l.category && (
                  <div>
                    <dt>{t('category')}</dt>
                    <dd>{fmt.category(l.category)}</dd>
                  </div>
                )}
                {l.locationCity && (
                  <div>
                    <dt>{t('location')}</dt>
                    <dd dir="auto">{fmt.city(l.locationCity)}</dd>
                  </div>
                )}
                <div>
                  <dt>{t('price')}</dt>
                  <dd>{l.isNegotiable ? t('negotiable') : t('fixed')}</dd>
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
                  <p className={styles.ownerNote}>{t('yours')}</p>
                  <Link
                    href={`/listings/${l.id}/edit`}
                    className={buttonClass({ variant: 'primary', block: true })}
                  >
                    <Pencil aria-hidden="true" />
                    {t('editFull')}
                  </Link>
                  {statusActions.map((status) => (
                    <Button key={status} block disabled={busy} onClick={() => handleStatus(status)}>
                      {t(`action.${status}`)}
                    </Button>
                  ))}
                  <Button variant="ghost" block onClick={handleDelete} className={styles.danger}>
                    <Trash2 aria-hidden="true" />
                    {tc('delete')}
                  </Button>
                </>
              ) : (
                <>
                  <div className={styles.desktopContact}>{contactButton}</div>
                  {!canContact && (
                    <p className="muted">{t('closed')}</p>
                  )}
                  <div className={styles.secondary}>
                    <FavoriteButton listingId={l.id} title={l.title} variant="button" />
                    <Button onClick={handleShare}>
                      <Share2 aria-hidden="true" />
                      {t('share')}
                    </Button>
                  </div>
                </>
              )}
            </section>

            {seller && (
              <section className="card card--pad">
                <h2 className={styles.blockTitle}>{t('seller')}</h2>
                <Link href={`/users/${seller.id}`} className={styles.seller}>
                  <Avatar name={sellerName} />
                  <span className={styles.sellerText}>
                    <span className={styles.sellerName} dir="auto">
                      {sellerName}
                    </span>
                    {seller.createdAt && (
                      <span className="muted">
                        {t('memberSince', { date: fmt.memberSince(seller.createdAt) })}
                      </span>
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
              {t('safety')}
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
            {t('edit')}
          </Link>
        </div>
      )}

      <Dialog
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        title={t('messageTo', { name: sellerName })}
        variant="sheet"
      >
        <form onSubmit={handleSend} className="form">
          <ul className={styles.quick} aria-label={t('suggested')}>
            {quickMessages.map((q) => (
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
          <Field label={t('yourMessage')} htmlFor="contact-message">
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
            {t('send')}
          </Button>
        </form>
      </Dialog>
    </>
  );
}

function Summary({ listing: l }: { listing: Listing }) {
  const t = useTranslations('listing');
  const fmt = useFormat();
  return (
    <div className={styles.summary}>
      <div className={styles.badges}>
        {l.status !== 'active' && <StatusBadge status={l.status} />}
        <span className="badge">{fmt.condition(l.condition)}</span>
        {l.isNegotiable && Number(l.price) > 0 && (
          <span className="badge badge--accent">{t('negotiable')}</span>
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
            <span dir="auto">{fmt.city(l.locationCity)}</span>
          </li>
        )}
        <li>
          <Clock aria-hidden="true" />
          <time dateTime={l.createdAt}>{t('posted', { when: fmt.timeAgo(l.createdAt) })}</time>
        </li>
        <li>
          <Eye aria-hidden="true" />
          {t('views', { count: l.viewsCount, n: fmt.number(l.viewsCount) })}
        </li>
      </ul>
    </div>
  );
}

function DetailSkeleton() {
  const t = useTranslations('listing');
  return (
    <div className={`container page ${styles.page}`} aria-busy="true" aria-label={t('loading')}>
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
