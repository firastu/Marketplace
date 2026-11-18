'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PartyPopper } from 'lucide-react';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { createListing, Listing } from '@/services/listings.service';
import { ListingForm } from '@/components/ListingForm';
import { PhotoManager } from '@/components/PhotoManager';
import { Button, buttonClass } from '@/components/ui/Button';
import { Stepper } from '@/components/ui/Stepper';
import styles from '../form-page.module.css';

const STEPS = ['Details', 'Photos', 'Done'];

export default function CreateListingPage() {
  const { user } = useRequireAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [step, setStep] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);

  if (!user) return <div className={`container page page--narrow ${styles.loading}`} aria-busy="true" />;

  return (
    <div className="container page page--narrow">
      <div className="page-title">
        <h1>Sell something</h1>
      </div>
      <Stepper steps={STEPS} current={step} />

      {step === 0 && (
        <section className="card card--pad">
          <ListingForm
            submitLabel="Continue to photos"
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
            <h2>Add photos</h2>
            <p className="muted">
              Listings with photos get far more replies. Show the whole item, then any defects.
            </p>
          </div>
          <PhotoManager listingId={listing.id} initialImages={[]} onCountChange={setPhotoCount} />
          <Button variant="accent" size="lg" block onClick={() => setStep(2)}>
            {photoCount === 0 ? 'Skip for now' : 'Finish'}
          </Button>
        </section>
      )}

      {step === 2 && listing && (
        <section className={`card card--pad ${styles.done}`}>
          <span className={styles.doneIcon} aria-hidden="true">
            <PartyPopper />
          </span>
          <h2>Your listing is live</h2>
          <p className="muted" dir="auto">
            “{listing.title}” can now be found by buyers. You will see their messages under
            Chats.
          </p>
          <div className={styles.doneActions}>
            <Link
              href={`/listings/${listing.id}`}
              className={buttonClass({ variant: 'primary', block: true })}
            >
              View listing
            </Link>
            <Link href={`/listings/${listing.id}/edit`} className={buttonClass({ block: true })}>
              Edit or add photos
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
              Sell another item
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
