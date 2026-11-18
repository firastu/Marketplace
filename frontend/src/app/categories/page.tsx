'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, WifiOff } from 'lucide-react';
import { Category, getCategories } from '@/services/categories.service';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { errorText } from '@/components/ui/Feedback';
import styles from './page.module.css';

type State = { categories: Category[] } | { error: string } | null;

export default function CategoriesPage() {
  const [state, setState] = useState<State>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getCategories()
      .then((categories) => !cancelled && setState({ categories }))
      .catch((err) => !cancelled && setState({ error: errorText(err, 'Could not load') }));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <div className="container page">
      <div className="page-title">
        <h1>Categories</h1>
      </div>

      {state === null && (
        <div className={styles.grid} aria-busy="true" aria-label="Loading categories">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={`skeleton ${styles.skeleton}`} />
          ))}
        </div>
      )}

      {state && 'error' in state && (
        <EmptyState
          icon={WifiOff}
          title="Could not load categories"
          actions={
            <Button
              variant="primary"
              onClick={() => {
                setState(null);
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </Button>
          }
        >
          {state.error}
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
                  <span className={styles.name}>{cat.name}</span>
                  {cat.description && <span className={styles.desc}>{cat.description}</span>}
                </span>
                <ChevronRight aria-hidden="true" className={`icon-flip ${styles.chevron}`} />
              </Link>
              {cat.children?.length > 0 && (
                <ul className={styles.children}>
                  {cat.children.map((child) => (
                    <li key={child.id}>
                      <Link href={`/?categoryId=${child.id}`} className="chip">
                        <CategoryIcon icon={child.icon} />
                        {child.name}
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
