import { Compass } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EmptyState } from '@/components/ui/EmptyState';
import { buttonClass } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations();
  return (
    <div className="container page">
      <title>{t('meta.notFound')}</title>
      <EmptyState
        icon={Compass}
        title={t('notFound.title')}
        actions={
          <>
            <Link href="/" className={buttonClass({ variant: 'primary' })}>
              {t('common.browseListings')}
            </Link>
            <Link href="/categories" className={buttonClass()}>
              {t('notFound.seeCategories')}
            </Link>
          </>
        }
      >
        {t('notFound.body')}
      </EmptyState>
    </div>
  );
}
