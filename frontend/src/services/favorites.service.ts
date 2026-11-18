import { apiClient } from './api-client';
import type { Listing } from './listings.service';

export interface Favorite {
  id: string;
  listingId: string;
  createdAt: string;
  listing: Listing;
}

export function getFavorites(): Promise<Favorite[]> {
  return apiClient<Favorite[]>('/favorites', { auth: true });
}

export function addFavorite(listingId: string): Promise<unknown> {
  return apiClient(`/favorites/${listingId}`, { method: 'POST', auth: true });
}

export function removeFavorite(listingId: string): Promise<unknown> {
  return apiClient(`/favorites/${listingId}`, { method: 'DELETE', auth: true });
}
