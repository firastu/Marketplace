'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { PartyPopper } from 'lucide-react';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { createListing, Listing } from '@/services/listings.service';
import { ListingForm } from '@/components/ListingForm';
import { PhotoManager } from '@/components/PhotoManager';
import { Button, buttonClass } from '@/components/ui/Button';
import { Stepper } from '@/components/ui/Stepper';
import styles from '../form-page.module.css';

export default function CreateListingPage() {
  const { user } = useRequireAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [step, setStep] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);
  const t = useTranslations('create');

  if (!user) return <div className={`container page page--narrow ${styles.loading}`} aria-busy="true" />;

  return (
    <div className="container page page--narrow">
      <div className="page-title">
        <h1>{t('title')}</h1>
      </div>
      <Stepper
        steps={[t('steps.details'), t('steps.photos'), t('steps.done')]}
        current={step}
      />

      {step === 0 && (
        <section className="card card--pad">
          <ListingForm
            submitLabel={t('toPhotos')}
            onSubmit={async (data) => {
              setListing(await createListing(data));
              setStep(1);
              window.scrollTo({ top: 0 });
            }}
          />
        </section>
      )}

      {step === 1 && listing && (
        <section className={`card card--pad ${styles.section}`}>
          <div>
            <h2>{t('addPhotos')}</h2>
            <p className="muted">{t('photosLead')}</p>
          </div>
          <PhotoManager listingId={listing.id} initialImages={[]} onCountChange={setPhotoCount} />
          <Button variant="accent" size="lg" block onClick={() => setStep(2)}>
            {photoCount === 0 ? t('skip') : t('finish')}
          </Button>
        </section>
      )}

      {step === 2 && listing && (
        <section className={`card card--pad ${styles.done}`}>
          <span className={styles.doneIcon} aria-hidden="true">
            <PartyPopper />
          </span>
          <h2>{t('liveTitle')}</h2>
          <p className="muted">{t('liveBody', { title: listing.title })}</p>
          <div className={styles.doneActions}>
            <Link
              href={`/listings/${listing.id}`}
              className={buttonClass({ variant: 'primary', block: true })}
            >
              {t('view')}
            </Link>
            <Link href={`/listings/${listing.id}/edit`} className={buttonClass({ block: true })}>
              {t('editOrPhotos')}
            </Link>
            <Button
              variant="ghost"
              block
              onClick={() => {
                setListing(null);
                setPhotoCount(0);
                setStep(0);
              }}
            >
              {t('another')}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
