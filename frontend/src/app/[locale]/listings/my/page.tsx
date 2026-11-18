'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useErrorText } from '@/i18n/errors';
import { Link, useRouter } from '@/i18n/navigation';
import { useFormat } from '@/i18n/use-format';
import {
  EllipsisVertical,
  Eye,
  ImageOff,
  LogOut,
  Pencil,
  Plus,
  Settings,
  Store,
  Trash2,
  UserRound,
  WifiOff,
} from 'lucide-react';
import { useRequireAuth } from '@/hooks/use-require-auth';
import {
  deleteListing,
  getImageUrl,
  getMyListings,
  getPrimaryImage,
  Listing,
  OwnerStatus,
  updateListingStatus,
} from '@/services/listings.service';
import { Avatar, Price, StatusBadge } from '@/components/bits';
import { Button, buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useConfirm, useToast } from '@/components/ui/Feedback';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Menu } from '@/components/ui/Menu';
import styles from './page.module.css';

const TABS = ['all', 'active', 'reserved', 'sold'] as const;
type TabKey = (typeof TABS)[number];

const STATUS_ACTIONS = [
  { status: 'active', label: 'markActive' },
  { status: 'reserved', label: 'reserved' },
  { status: 'sold', label: 'sold' },
] as const satisfies readonly { status: OwnerStatus; label: string }[];

type State = { listings: Listing[] } | { error: unknown } | null;

export default function MyListingsPage() {
  const { user, logout } = useRequireAuth();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [state, setState] = useState<State>(null);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<TabKey>('all');
  const userId = user?.id;
  const t = useTranslations('my');
  const tl = useTranslations('listing');
  const tn = useTranslations('nav');
  const tf = useTranslations('feedback');
  const tc = useTranslations('common');
  const fmt = useFormat();
  const errorText = useErrorText();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getMyListings()
      .then((listings) => !cancelled && setState({ listings }))
      .catch((error) => !cancelled && setState({ error }));
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  const listings = useMemo(() => (state && 'listings' in state ? state.listings : []), [state]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: listings.length };
    for (const l of listings) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [listings]);
  const visible = tab === 'all' ? listings : listings.filter((l) => l.status === tab);

  const replace = (updated: Listing) =>
    setState((prev) =>
      prev && 'listings' in prev
        ? { listings: prev.listings.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)) }
        : prev,
    );

  const handleStatus = async (listing: Listing, status: OwnerStatus) => {
    try {
      replace(await updateListingStatus(listing.id, status));
      toast(tf('statusUpdated'), 'success');
    } catch (err) {
      toast(errorText(err, tf('statusFailed')), 'error');
    }
  };

  const handleDelete = async (listing: Listing) => {
    const ok = await confirm({
      title: tl('deleteTitle'),
      message: tl.rich('deleteBodyNamed', {
        title: listing.title,
        b: (chunks) => (
          <strong>
            <bdi>{chunks}</bdi>
          </strong>
        ),
      }),
      confirmLabel: tc('delete'),
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteListing(listing.id);
      setState((prev) =>
        prev && 'listings' in prev
          ? { listings: prev.listings.filter((l) => l.id !== listing.id) }
          : prev,
      );
      toast(tf('listingDeleted'), 'success');
    } catch (err) {
      toast(errorText(err, tf('deleteFailed')), 'error');
    }
  };

  if (!user) return <div className="container page" aria-busy="true" />;
  const name = user.displayName || user.username;

  return (
    <div className="container page page--narrow">
      <section className={`card card--pad ${styles.profile}`}>
        <Avatar name={name} size="lg" />
        <div className={styles.profileText}>
          <h1 className={styles.name} dir="auto">
            {name}
          </h1>
          <p className="muted">
            <bdi dir="ltr">{user.email}</bdi>
          </p>
        </div>
        <div className={styles.profileActions}>
          <Link href={`/users/${user.id}`} className={buttonClass({ size: 'sm' })}>
            <UserRound aria-hidden="true" />
            {tn('publicProfile')}
          </Link>
          <Link href="/account" className={buttonClass({ size: 'sm' })}>
            <Settings aria-hidden="true" />
            {tn('account')}
          </Link>
          <LanguageSwitcher className={buttonClass({ size: 'sm' })} />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              logout();
              toast(tn('loggedOut'));
              router.push('/');
            }}
          >
            <LogOut aria-hidden="true" className="icon-flip" />
            {tn('logout')}
          </Button>
        </div>
      </section>

      <div className="page-title">
        <h2>{t('title')}</h2>
        <Link href="/listings/create" className={buttonClass({ variant: 'accent', size: 'sm' })}>
          <Plus aria-hidden="true" />
          {t('new')}
        </Link>
      </div>

      <div className="tabs" role="tablist" aria-label={t('filterLabel')}>
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
          >
            {key === 'all' ? t('all') : fmt.status(key)}
            <span className="tab__count">{fmt.number(counts[key] ?? 0)}</span>
          </button>
        ))}
      </div>

      {state === null && (
        <ul className={styles.list} aria-busy="true" aria-label={t('loading')}>
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className={`skeleton ${styles.rowSkeleton}`} />
          ))}
        </ul>
      )}

      {state && 'error' in state && (
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

      {state && 'listings' in state && visible.length === 0 && (
        <EmptyState
          icon={Store}
          title={tab === 'all' ? t('emptyTitle') : t('emptyTabTitle')}
          actions={
            tab === 'all' && (
              <Link href="/listings/create" className={buttonClass({ variant: 'accent' })}>
                {t('sellFirst')}
              </Link>
            )
          }
        >
          {tab === 'all' ? t('emptyBody') : t('emptyTabBody')}
        </EmptyState>
      )}

      {visible.length > 0 && (
        <ul className={styles.list}>
          {visible.map((listing) => {
            const image = getPrimaryImage(listing.images ?? []);
            return (
              <li key={listing.id} className={styles.row}>
                <Link href={`/listings/${listing.id}`} className={styles.thumb} tabIndex={-1}>
                  {image ? (
                    <img src={getImageUrl(image, 'thumb')} alt="" loading="lazy" />
                  ) : (
                    <ImageOff aria-hidden="true" />
                  )}
                </Link>
                <div className={styles.rowText}>
                  <Link
                    href={`/listings/${listing.id}`}
                    className={`${styles.rowTitle} clamp-1`}
                    dir="auto"
                  >
                    {listing.title}
                  </Link>
                  <Price price={listing.price} currency={listing.currency} />
                  <p className={styles.rowMeta}>
                    <StatusBadge status={listing.status} />
                    <span>
                      <Eye aria-hidden="true" />
                      {fmt.number(listing.viewsCount)}
                    </span>
                    <span>{fmt.timeAgo(listing.createdAt)}</span>
                  </p>
                </div>
                <Menu
                  label={t('actionsFor', { title: listing.title })}
                  trigger={<EllipsisVertical aria-hidden="true" />}
                >
                  {(close) => (
                    <>
                      <Link
                        href={`/listings/${listing.id}/edit`}
                        className="menu__item"
                        onClick={close}
                      >
                        <Pencil aria-hidden="true" />
                        {tl('editFull')}
                      </Link>
                      {/* Removed and held listings: the status is not the seller's to change. */}
                      {!['removed', 'pending_review'].includes(listing.status) &&
                        STATUS_ACTIONS.filter((a) => a.status !== listing.status).map((a) => (
                          <button
                            key={a.status}
                            type="button"
                            className="menu__item"
                            onClick={() => {
                              close();
                              void handleStatus(listing, a.status);
                            }}
                          >
                            <Store aria-hidden="true" />
                            {tl(`action.${a.label}`)}
                          </button>
                        ))}
                      <div className="menu__sep" />
                      <button
                        type="button"
                        className="menu__item menu__item--danger"
                        onClick={() => {
                          close();
                          void handleDelete(listing);
                        }}
                      >
                        <Trash2 aria-hidden="true" />
                        {tc('delete')}
                      </button>
                    </>
                  )}
                </Menu>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
