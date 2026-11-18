'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useErrorText } from '@/i18n/errors';
import { Heart, WifiOff } from 'lucide-react';
import { useFavorites } from '@/hooks/use-favorites';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { Favorite, getFavorites } from '@/services/favorites.service';
import { ListingCard, ListingGrid, ListingGridSkeleton } from '@/components/ListingCard';
import { Button, buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

type State = { favorites: Favorite[] } | { error: unknown } | null;

export default function FavoritesPage() {
  const { user } = useRequireAuth();
  const { ids } = useFavorites();
  const [state, setState] = useState<State>(null);
  const [attempt, setAttempt] = useState(0);
  const userId = user?.id;
  const t = useTranslations('favorites');
  const tc = useTranslations('common');
  const errorText = useErrorText();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getFavorites()
      .then((favorites) => !cancelled && setState({ favorites }))
      .catch((error) => !cancelled && setState({ error }));
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  // A heart tapped on this page removes the card straight away.
  const favorites =
    state && 'favorites' in state
      ? state.favorites.filter((f) => !ids || ids.has(f.listingId))
      : [];

  return (
    <div className="container page">
      <div className="page-title">
        <h1>{t('title')}</h1>
      </div>

      {(!user || state === null) && <ListingGridSkeleton count={4} />}

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
          {errorText(state.error)}
        </EmptyState>
      )}

      {state && 'favorites' in state && favorites.length === 0 && (
        <EmptyState
          icon={Heart}
          title={t('emptyTitle')}
          actions={
            <Link href="/" className={buttonClass({ variant: 'primary' })}>
              {tc('browseListings')}
            </Link>
          }
        >
          {t('emptyBody')}
        </EmptyState>
      )}

      {favorites.length > 0 && (
        <ListingGrid>
          {favorites.map((fav) => (
            <ListingCard key={fav.id} listing={fav.listing} />
          ))}
        </ListingGrid>
      )}
    </div>
  );
}
