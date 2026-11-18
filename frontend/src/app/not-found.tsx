import Link from 'next/link';
import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { buttonClass } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="container page">
      <EmptyState
        icon={Compass}
        title="This page took a wrong turn"
        actions={
          <>
            <Link href="/" className={buttonClass({ variant: 'primary' })}>
              Browse listings
            </Link>
            <Link href="/categories" className={buttonClass()}>
              See categories
            </Link>
          </>
        }
      >
        The link may be old, or the listing was removed by its seller.
      </EmptyState>
    </div>
  );
}
