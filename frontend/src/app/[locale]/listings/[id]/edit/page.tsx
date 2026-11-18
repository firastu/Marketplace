'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useErrorText } from '@/i18n/errors';
import { Link, useRouter } from '@/i18n/navigation';
import { useFormat } from '@/i18n/use-format';
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
import { useConfirm, useToast } from '@/components/ui/Feedback';
import styles from '../../form-page.module.css';

const STATUS_CHOICES: OwnerStatus[] = ['active', 'reserved', 'sold'];

type State = { listing: Listing } | { error: unknown } | null;

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useRequireAuth();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [state, setState] = useState<State>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const userId = user?.id;
  const t = useTranslations('edit');
  const tl = useTranslations('listing');
  const tf = useTranslations('feedback');
  const tc = useTranslations('common');
  const fmt = useFormat();
  const errorText = useErrorText();

  useEffect(() => {
    if (!id || !userId) return;
    let cancelled = false;
    getListingById(id)
      .then((listing) => !cancelled && setState({ listing }))
      .catch((error) => !cancelled && setState({ error }));
    return () => {
      cancelled = true;
    };
  }, [id, userId]);

  if (!user || state === null) {
    return (
      <div className="container page page--narrow" aria-busy="true" aria-label={tl('loading')}>
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
          title={t('notFoundTitle')}
          actions={
            <Link href="/listings/my" className={buttonClass({ variant: 'primary' })}>
              {t('myListings')}
            </Link>
          }
        >
          {errorText(state.error, tc('couldNotLoad'))}
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
          title={t('notYoursTitle')}
          actions={
            <Link href={`/listings/${listing.id}`} className={buttonClass({ variant: 'primary' })}>
              {t('view')}
            </Link>
          }
        >
          {t('notYoursBody')}
        </EmptyState>
      </div>
    );
  }

  const locked = listing.status === 'removed';

  const handleStatus = async (status: OwnerStatus) => {
    setStatusBusy(true);
    try {
      setState({ listing: await updateListingStatus(listing.id, status) });
      toast(tf('statusUpdated'), 'success');
    } catch (err) {
      toast(errorText(err, tf('statusFailed')), 'error');
    } finally {
      setStatusBusy(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: tl('deleteTitle'),
      message: tl('deleteBody'),
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

  return (
    <div className="container page page--narrow">
      <Link href={`/listings/${listing.id}`} className={styles.back}>
        <ArrowLeft aria-hidden="true" className="icon-flip" />
        {t('back')}
      </Link>
      <div className="page-title">
        <h1>{t('title')}</h1>
        <StatusBadge status={listing.status} />
      </div>

      {locked ? (
        <div className="notice notice--danger" role="alert">
          <Lock aria-hidden="true" />
          <span className="notice__body">{t('locked')}</span>
        </div>
      ) : (
        <>
          <section className={`card card--pad ${styles.section}`}>
            <h2>{t('availability')}</h2>
            <div className={styles.statusRow} role="group" aria-label={t('statusLabel')}>
              {STATUS_CHOICES.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`chip ${listing.status === status ? 'chip--active' : ''}`}
                  aria-pressed={listing.status === status}
                  disabled={statusBusy}
                  onClick={() => listing.status !== status && handleStatus(status)}
                >
                  {fmt.status(status)}
                </button>
              ))}
            </div>
          </section>

          <section className={`card card--pad ${styles.section}`}>
            <h2>{t('photos')}</h2>
            <PhotoManager listingId={listing.id} initialImages={listing.images ?? []} />
          </section>

          <section className={`card card--pad ${styles.section}`}>
            <h2>{t('details')}</h2>
            <ListingForm
              initial={listing}
              submitLabel={t('save')}
              onSubmit={async (data) => {
                const updated = await updateListing(listing.id, data);
                setState({ listing: updated });
                toast(t('saved'), 'success');
              }}
            />
          </section>
        </>
      )}

      <section className={`card card--pad ${styles.section}`}>
        <div className={styles.sectionHead}>
          <div>
            <h2>{t('deleteTitle')}</h2>
            <p className="muted">{t('deleteLead')}</p>
          </div>
          <Button variant="danger" onClick={handleDelete}>
            <Trash2 aria-hidden="true" />
            {tc('delete')}
          </Button>
        </div>
      </section>
    </div>
  );
}
