'use client';

import { TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations();
  return (
    <div className="container page">
      <EmptyState
        icon={TriangleAlert}
        title={t('errorPage.title')}
        actions={
          <Button variant="primary" onClick={reset}>
            {t('common.tryAgain')}
          </Button>
        }
      >
        {t('errorPage.body')}
      </EmptyState>
    </div>
  );
}
