'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, WifiOff } from 'lucide-react';
import { useFavorites } from '@/hooks/use-favorites';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { Favorite, getFavorites } from '@/services/favorites.service';
import { ListingCard, ListingGrid, ListingGridSkeleton } from '@/components/ListingCard';
import { Button, buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { errorText } from '@/components/ui/Feedback';

type State = { favorites: Favorite[] } | { error: string } | null;

export default function FavoritesPage() {
  const { user } = useRequireAuth();
  const { ids } = useFavorites();
  const [state, setState] = useState<State>(null);
  const [attempt, setAttempt] = useState(0);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getFavorites()
      .then((favorites) => !cancelled && setState({ favorites }))
      .catch(
        (err) => !cancelled && setState({ error: errorText(err, 'Could not load favorites') }),
      );
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
        <h1>Saved listings</h1>
      </div>

      {(!user || state === null) && <ListingGridSkeleton count={4} />}

      {state && 'error' in state && (
        <EmptyState
          icon={WifiOff}
          title="Could not load your favorites"
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

      {state && 'favorites' in state && favorites.length === 0 && (
        <EmptyState
          icon={Heart}
          title="Nothing saved yet"
          actions={
            <Link href="/" className={buttonClass({ variant: 'primary' })}>
              Browse listings
            </Link>
          }
        >
          Tap the heart on a listing to keep it here and compare later.
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
