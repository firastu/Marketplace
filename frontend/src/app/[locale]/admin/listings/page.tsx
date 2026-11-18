'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ImageOff, ListChecks, WifiOff } from 'lucide-react';
import { useErrorText } from '@/i18n/errors';
import { Link } from '@/i18n/navigation';
import { useFormat } from '@/i18n/use-format';
import {
  approveListing,
  getPendingListings,
  Paginated,
  PendingListing,
  removeListing,
} from '@/services/admin.service';
import { getImageUrl, getPrimaryImage } from '@/services/listings.service';
import { Price } from '@/components/bits';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Feedback';
import { ActionDialog, Pager, Person, useAdmin } from '../AdminShell';
import styles from '../admin.module.css';

type Kind = 'approveListing' | 'removeListing';
type State = Paginated<PendingListing> | { error: unknown } | null;

/** Listings the prohibited-terms check held back: approve or remove. */
export default function HeldListings() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const fmt = useFormat();
  const toast = useToast();
  const errorText = useErrorText();
  const { refreshStats } = useAdmin();
  const [page, setPage] = useState(1);
  const [state, setState] = useState<State>(null);
  const [reload, setReload] = useState(0);
  const [pending, setPending] = useState<{ kind: Kind; listing: PendingListing } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPendingListings(page)
      .then((res) => !cancelled && setState(res))
      .catch((error) => !cancelled && setState({ error }));
    return () => {
      cancelled = true;
    };
  }, [page, reload]);

  const refresh = useCallback(() => {
    setReload((n) => n + 1);
    refreshStats();
  }, [refreshStats]);

  const run = async (text: string) => {
    if (!pending) return;
    if (pending.kind === 'approveListing') await approveListing(pending.listing.id, text);
    else await removeListing(pending.listing.id, text);
    toast(t(`done.${pending.kind}`), 'success');
    refresh();
  };

  const removing = pending?.kind === 'removeListing';

  return (
    <>
      <h2 className="visually-hidden">{t('nav.listings')}</h2>
      <p className={`muted ${styles.lead}`}>{t('held.lead')}</p>

      {state === null && (
        <ul className={styles.list} aria-busy="true" aria-label={t('loading')}>
          {Array.from({ length: 3 }, (_, i) => (
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
                setReload((n) => n + 1);
              }}
            >
              {tc('tryAgain')}
            </Button>
          }
        >
          {errorText(state.error)}
        </EmptyState>
      )}

      {state && 'data' in state && state.data.length === 0 && (
        <EmptyState icon={ListChecks} title={t('held.emptyTitle')}>
          {t('held.emptyBody')}
        </EmptyState>
      )}

      {state && 'data' in state && state.data.length > 0 && (
        <>
          <ul className={styles.list}>
            {state.data.map((listing) => {
              const image = getPrimaryImage(listing.images ?? []);
              return (
                <li key={listing.id} className={`card ${styles.row}`}>
                  <div className={styles.heldHead}>
                    <Link href={`/listings/${listing.id}`} className={styles.thumb} tabIndex={-1}>
                      {image ? (
                        <img src={getImageUrl(image, 'thumb')} alt="" loading="lazy" />
                      ) : (
                        <ImageOff aria-hidden="true" />
                      )}
                    </Link>
                    <div className={styles.heldText}>
                      <Link href={`/listings/${listing.id}`} className={styles.heldTitle} dir="auto">
                        {listing.title}
                      </Link>
                      <Price price={listing.price} currency={listing.currency} />
                      <span className="muted">
                        <Person person={listing.user} /> · {fmt.timeAgo(listing.createdAt)}
                      </span>
                    </div>
                  </div>

                  <dl className={styles.facts}>
                    <div>
                      <dt>{t('held.matched')}</dt>
                      <dd className={styles.flags}>
                        {(listing.moderationFlags ?? []).map((flag) => (
                          <bdi key={flag} className="badge badge--danger">
                            {flag}
                          </bdi>
                        ))}
                      </dd>
                    </div>
                    <div>
                      <dt>{t('held.description')}</dt>
                      <dd className={`${styles.quote} clamp-2`} dir="auto">
                        {listing.description}
                      </dd>
                    </div>
                  </dl>

                  <div className={styles.rowActions}>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setPending({ kind: 'approveListing', listing })}
                    >
                      {t('act.approveListing')}
                    </Button>
                    <span className={styles.spacer} />
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setPending({ kind: 'removeListing', listing })}
                    >
                      {t('act.removeListing')}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          <Pager
            page={state.meta.page}
            totalPages={state.meta.totalPages}
            onPage={(next) => {
              setPage(next);
              setState(null);
            }}
          />
        </>
      )}

      <ActionDialog
        open={!!pending}
        onClose={() => setPending(null)}
        title={pending ? t(`confirm.${pending.kind}.title`) : ''}
        fieldLabel={removing ? t('reasonRequired') : t('noteOptional')}
        fieldHint={removing ? t('reasonHint') : undefined}
        required={removing}
        danger={removing}
        confirmLabel={pending ? t(`confirm.${pending.kind}.confirm`) : ''}
        onConfirm={run}
      >
        {pending && (
          <p>
            {t.rich(`confirm.${pending.kind}.body`, {
              name: pending.listing.title,
              user: '',
              b: (chunks) => (
                <strong>
                  <bdi>{chunks}</bdi>
                </strong>
              ),
            })}
          </p>
        )}
      </ActionDialog>
    </>
  );
}
