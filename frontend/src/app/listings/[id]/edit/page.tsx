'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Lock, SearchX, Trash2 } from 'lucide-react';
import { useRequireAuth } from '@/hooks/use-require-auth';
import {
  deleteListing,
  getListingById,
  Listing,
  OwnerStatus,
  updateListing,
  updateListingStatus,
} from '@/services/listings.service';
import { StatusBadge } from '@/components/bits';
import { ListingForm } from '@/components/ListingForm';
import { PhotoManager } from '@/components/PhotoManager';
import { Button, buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { errorText, useConfirm, useToast } from '@/components/ui/Feedback';
import styles from '../../form-page.module.css';

const STATUS_CHOICES: { status: OwnerStatus; label: string }[] = [
  { status: 'active', label: 'Available' },
  { status: 'reserved', label: 'Reserved' },
  { status: 'sold', label: 'Sold' },
];

type State = { listing: Listing } | { error: string } | null;

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useRequireAuth();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [state, setState] = useState<State>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const userId = user?.id;

  useEffect(() => {
    if (!id || !userId) return;
    let cancelled = false;
    getListingById(id)
      .then((listing) => !cancelled && setState({ listing }))
      .catch((err) => !cancelled && setState({ error: errorText(err, 'Could not load') }));
    return () => {
      cancelled = true;
    };
  }, [id, userId]);

  if (!user || state === null) {
    return (
      <div className="container page page--narrow" aria-busy="true" aria-label="Loading listing">
        <div className={`skeleton ${styles.skeleton}`} />
        <div className={`skeleton ${styles.skeleton}`} />
      </div>
    );
  }

  if ('error' in state) {
    return (
      <div className="container page">
        <EmptyState
          icon={SearchX}
          title="Listing not found"
          actions={
            <Link href="/listings/my" className={buttonClass({ variant: 'primary' })}>
              My listings
            </Link>
          }
        >
          {state.error}
        </EmptyState>
      </div>
    );
  }

  const listing = state.listing;

  if (listing.userId !== user.id) {
    return (
      <div className="container page">
        <EmptyState
          icon={Lock}
          title="This is not your listing"
          actions={
            <Link href={`/listings/${listing.id}`} className={buttonClass({ variant: 'primary' })}>
              View listing
            </Link>
          }
        >
          Only the seller can edit it.
        </EmptyState>
      </div>
    );
  }

  const locked = listing.status === 'removed';

  const handleStatus = async (status: OwnerStatus) => {
    setStatusBusy(true);
    try {
      setState({ listing: await updateListingStatus(listing.id, status) });
      toast('Status updated', 'success');
    } catch (err) {
      toast(errorText(err, 'Could not change the status'), 'error');
    } finally {
      setStatusBusy(false);
    }
  };

  const handleDelete = async () => {
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

  return (
    <div className="container page page--narrow">
      <Link href={`/listings/${listing.id}`} className={styles.back}>
        <ArrowLeft aria-hidden="true" className="icon-flip" />
        Back to listing
      </Link>
      <div className="page-title">
        <h1>Edit listing</h1>
        <StatusBadge status={listing.status} />
      </div>

      {locked ? (
        <div className="notice notice--danger" role="alert">
          <Lock aria-hidden="true" />
          <span className="notice__body">
            This listing was removed by moderation and can no longer be changed.
          </span>
        </div>
      ) : (
        <>
          <section className={`card card--pad ${styles.section}`}>
            <h2>Availability</h2>
            <div className={styles.statusRow} role="group" aria-label="Listing status">
              {STATUS_CHOICES.map((choice) => (
                <button
                  key={choice.status}
                  type="button"
                  className={`chip ${listing.status === choice.status ? 'chip--active' : ''}`}
                  aria-pressed={listing.status === choice.status}
                  disabled={statusBusy}
                  onClick={() => listing.status !== choice.status && handleStatus(choice.status)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </section>

          <section className={`card card--pad ${styles.section}`}>
            <h2>Photos</h2>
            <PhotoManager listingId={listing.id} initialImages={listing.images ?? []} />
          </section>

          <section className={`card card--pad ${styles.section}`}>
            <h2>Details</h2>
            <ListingForm
              initial={listing}
              submitLabel="Save changes"
              onSubmit={async (data) => {
                const updated = await updateListing(listing.id, data);
                setState({ listing: updated });
                toast('Changes saved', 'success');
              }}
            />
          </section>
        </>
      )}

      <section className={`card card--pad ${styles.section}`}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Delete listing</h2>
            <p className="muted">Sold it elsewhere or changed your mind?</p>
          </div>
          <Button variant="danger" onClick={handleDelete}>
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        </div>
      </section>
    </div>
  );
}
