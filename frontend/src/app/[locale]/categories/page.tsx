'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useErrorText } from '@/i18n/errors';
import { useFormat } from '@/i18n/use-format';
import { ChevronRight, WifiOff } from 'lucide-react';
import { Category, getCategories } from '@/services/categories.service';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import styles from './page.module.css';

type State = { categories: Category[] } | { error: unknown } | null;

export default function CategoriesPage() {
  const [state, setState] = useState<State>(null);
  const [attempt, setAttempt] = useState(0);
  const t = useTranslations('categories');
  const tc = useTranslations('common');
  const fmt = useFormat();
  const errorText = useErrorText();

  useEffect(() => {
    let cancelled = false;
    getCategories()
      .then((categories) => !cancelled && setState({ categories }))
      .catch((error) => !cancelled && setState({ error }));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <div className="container page">
      <div className="page-title">
        <h1>{t('title')}</h1>
      </div>

      {state === null && (
        <div className={styles.grid} aria-busy="true" aria-label={t('loading')}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={`skeleton ${styles.skeleton}`} />
          ))}
        </div>
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
                setAttempt((n) => n + 1);
              }}
            >
              {tc('tryAgain')}
            </Button>
          }
        >
          {errorText(state.error, tc('couldNotLoad'))}
        </EmptyState>
      )}

      {state && 'categories' in state && (
        <ul className={styles.grid}>
          {state.categories.map((cat) => (
            <li key={cat.id} className={styles.card}>
              <Link href={`/?categoryId=${cat.id}`} className={styles.head}>
                <span className={styles.icon}>
                  <CategoryIcon icon={cat.icon} />
                </span>
                <span className={styles.headText}>
                  <span className={styles.name}>{fmt.category(cat)}</span>
                  {/* The API has descriptions in English only. */}
                  {cat.description && fmt.locale === 'en' && (
                    <span className={styles.desc}>{cat.description}</span>
                  )}
                </span>
                <ChevronRight aria-hidden="true" className={`icon-flip ${styles.chevron}`} />
              </Link>
              {cat.children?.length > 0 && (
                <ul className={styles.children}>
                  {cat.children.map((child) => (
                    <li key={child.id}>
                      <Link href={`/?categoryId=${child.id}`} className="chip">
                        <CategoryIcon icon={child.icon} />
                        {fmt.category(child)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
