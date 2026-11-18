'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  EllipsisVertical,
  Eye,
  ImageOff,
  LogOut,
  Pencil,
  Plus,
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
import { timeAgo } from '@/utils/format';
import { Avatar, Price, StatusBadge } from '@/components/bits';
import { Button, buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { errorText, useConfirm, useToast } from '@/components/ui/Feedback';
import { Menu } from '@/components/ui/Menu';
import styles from './page.module.css';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Available' },
  { key: 'reserved', label: 'Reserved' },
  { key: 'sold', label: 'Sold' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const STATUS_ACTIONS: { status: OwnerStatus; label: string }[] = [
  { status: 'active', label: 'Mark as available' },
  { status: 'reserved', label: 'Mark as reserved' },
  { status: 'sold', label: 'Mark as sold' },
];

type State = { listings: Listing[] } | { error: string } | null;

export default function MyListingsPage() {
  const { user, logout } = useRequireAuth();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [state, setState] = useState<State>(null);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<TabKey>('all');
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getMyListings()
      .then((listings) => !cancelled && setState({ listings }))
      .catch(
        (err) =>
          !cancelled && setState({ error: errorText(err, 'Could not load your listings') }),
      );
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
      toast('Status updated', 'success');
    } catch (err) {
      toast(errorText(err, 'Could not change the status'), 'error');
    }
  };

  const handleDelete = async (listing: Listing) => {
    const ok = await confirm({
      title: 'Delete this listing?',
      message: (
        <>
          <strong dir="auto">{listing.title}</strong> disappears from search right away. Your
          chats about it are kept.
        </>
      ),
      confirmLabel: 'Delete',
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
      toast('Listing deleted', 'success');
    } catch (err) {
      toast(errorText(err, 'Could not delete the listing'), 'error');
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
          <p className="muted">{user.email}</p>
        </div>
        <div className={styles.profileActions}>
          <Link href={`/users/${user.id}`} className={buttonClass({ size: 'sm' })}>
            <UserRound aria-hidden="true" />
            Public profile
          </Link>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              logout();
              toast('You are logged out');
              router.push('/');
            }}
          >
            <LogOut aria-hidden="true" className="icon-flip" />
            Log out
          </Button>
        </div>
      </section>

      <div className="page-title">
        <h2>My listings</h2>
        <Link href="/listings/create" className={buttonClass({ variant: 'accent', size: 'sm' })}>
          <Plus aria-hidden="true" />
          New listing
        </Link>
      </div>

      <div className="tabs" role="tablist" aria-label="Filter by status">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            <span className="tab__count">{counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {state === null && (
        <ul className={styles.list} aria-busy="true" aria-label="Loading your listings">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className={`skeleton ${styles.rowSkeleton}`} />
          ))}
        </ul>
      )}

      {state && 'error' in state && (
        <EmptyState
          icon={WifiOff}
          title="Could not load your listings"
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

      {state && 'listings' in state && visible.length === 0 && (
        <EmptyState
          icon={Store}
          title={tab === 'all' ? 'Nothing for sale yet' : 'Nothing in this tab'}
          actions={
            tab === 'all' && (
              <Link href="/listings/create" className={buttonClass({ variant: 'accent' })}>
                Sell your first item
              </Link>
            )
          }
        >
          {tab === 'all'
            ? 'Take a photo, set a price, and your listing is live in a minute.'
            : 'Listings move here when you change their status.'}
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
                      {listing.viewsCount}
                    </span>
                    <span>{timeAgo(listing.createdAt)}</span>
                  </p>
                </div>
                <Menu label={`Actions for ${listing.title}`} trigger={<EllipsisVertical aria-hidden="true" />}>
                  {(close) => (
                    <>
                      <Link
                        href={`/listings/${listing.id}/edit`}
                        className="menu__item"
                        onClick={close}
                      >
                        <Pencil aria-hidden="true" />
                        Edit listing and photos
                      </Link>
                      {listing.status !== 'removed' &&
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
                            {a.label}
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
                        Delete
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
