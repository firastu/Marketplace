import { apiClient } from './api-client';

export interface Listing {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  condition: string;
  status: string;
  locationCity: string;
  locationZip: string;
  isNegotiable: boolean;
  createdAt: string;
  images: { id: string; url: string; isPrimary: boolean }[];
  category: { id: string; name: string; slug: string };
  user: { id: string; username: string; displayName: string };
}

export interface PaginatedListings {
  data: Listing[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ListingSearchParams {
  page?: number;
  limit?: number;
  q?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  locationCity?: string;
  sortBy?: 'newest' | 'price_asc' | 'price_desc';
}

export interface CreateListingData {
  categoryId: string;
  title: string;
  description: string;
  price: number;
  currency?: string;
  condition?: string;
  locationCity?: string;
  locationZip?: string;
  isNegotiable?: boolean;
}

export function getListings(params: ListingSearchParams = {}): Promise<PaginatedListings> {
  const { page = 1, limit = 20, ...filters } = params;
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  return apiClient<PaginatedListings>(`/listings?${searchParams.toString()}`);
}

export function getListingById(id: string): Promise<Listing> {
  return apiClient<Listing>(`/listings/${id}`);
}

export function getMyListings(): Promise<Listing[]> {
  return apiClient<PaginatedListings>('/listings/my', { auth: true }).then((res) => res.data);
}

export function createListing(data: CreateListingData): Promise<Listing> {
  return apiClient<Listing>('/listings', { method: 'POST', body: data, auth: true });
}

export function deleteListing(id: string): Promise<void> {
  return apiClient<void>(`/listings/${id}`, { method: 'DELETE', auth: true });
}
