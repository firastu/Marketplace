'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/services/api-client';
import { addFavorite, getFavorites, removeFavorite } from '@/services/favorites.service';

interface FavoritesContextValue {
  /** null while the list has not been loaded yet. */
  ids: ReadonlySet<string> | null;
  isFavorite: (listingId: string) => boolean;
  /** Resolves to the new state. Throws if the server refuses. */
  toggle: (listingId: string) => Promise<boolean>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/**
 * The logged-in user's favorite listing IDs, loaded once and shared by
 * every heart button, so a card grid does not issue one request per card.
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<{ userId: string; ids: Set<string> } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getFavorites()
      .then((favorites) => {
        if (!cancelled) setState({ userId, ids: new Set(favorites.map((f) => f.listingId)) });
      })
      .catch(() => {
        if (!cancelled) setState({ userId, ids: new Set() });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const ids = state && state.userId === userId ? state.ids : null;

  const toggle = useCallback(
    async (listingId: string) => {
      if (!userId) throw new ApiError('Log in to save listings', 401);
      const wasFavorite = ids?.has(listingId) ?? false;
      const apply = (on: boolean) =>
        setState((prev) => {
          const next = new Set(prev?.userId === userId ? prev.ids : []);
          if (on) next.add(listingId);
          else next.delete(listingId);
          return { userId, ids: next };
        });

      apply(!wasFavorite); // optimistic: the heart reacts at once
      try {
        if (wasFavorite) await removeFavorite(listingId);
        else await addFavorite(listingId);
      } catch (err) {
        // "Already in favorites" means the server agrees with the new state.
        if (!(err instanceof ApiError && err.status === 409 && !wasFavorite)) {
          apply(wasFavorite);
          throw err;
        }
      }
      return !wasFavorite;
    },
    [userId, ids],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({ ids, isFavorite: (id) => ids?.has(id) ?? false, toggle }),
    [ids, toggle],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
