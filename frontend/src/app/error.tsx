'use client';

import { TriangleAlert } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container page">
      <EmptyState
        icon={TriangleAlert}
        title="Something went wrong"
        actions={
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>
        }
      >
        The page could not be shown. Your connection may have dropped; nothing was lost.
      </EmptyState>
    </div>
  );
}
