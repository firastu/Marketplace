import { apiClient } from './api-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';

export type ImageStatus = 'uploaded' | 'processing' | 'ready' | 'failed';

export interface ListingImage {
  id: string;
  listingId: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  status: ImageStatus;
  storageKeyOriginal: string | null;
  storageKeyThumb: string | null;
  storageKeyMedium: string | null;
  storageKeyLarge: string | null;
  createdAt: string;
  deletedAt: string | null;
}

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
  images: ListingImage[];
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

function buildImageUrl(key: string | null, fallbackUrl: string): string {
  if (key) {
    return `${BACKEND_URL}/uploads/listings/${key}`;
  }
  return `${BACKEND_URL}${fallbackUrl}`;
}

export function getImageUrl(image: ListingImage, variant: 'thumb' | 'medium' | 'large' | 'original' = 'medium'): string {
  const variantMap: Record<string, string | null> = {
    thumb: image.storageKeyThumb,
    medium: image.storageKeyMedium,
    large: image.storageKeyLarge,
    original: image.storageKeyOriginal,
  };
  return buildImageUrl(variantMap[variant] ?? null, image.url);
}

export function getPrimaryImage(images: ListingImage[]): ListingImage | null {
  return images.find((img) => img.isPrimary) ?? images[0] ?? null;
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

export function getListingImages(listingId: string): Promise<ListingImage[]> {
  return apiClient<ListingImage[]>(`/listings/${listingId}/images`);
}

export function uploadImage(
  listingId: string,
  file: File,
  isPrimary = false,
): Promise<ListingImage> {
  const formData = new FormData();
  formData.append('file', file);
  if (isPrimary) formData.append('primary', 'true');
  return apiClient<ListingImage>(
    `/listings/${listingId}/images`,
    { method: 'POST', body: formData, auth: true, multipart: true },
  );
}

export function deleteImage(listingId: string, imageId: string): Promise<void> {
  return apiClient<void>(
    `/listings/${listingId}/images/${imageId}`,
    { method: 'DELETE', auth: true },
  );
}

export function setCoverImage(listingId: string, imageId: string): Promise<ListingImage> {
  return apiClient<ListingImage>(
    `/listings/${listingId}/images/${imageId}/cover`,
    { method: 'PATCH', auth: true },
  );
}

export function reorderImages(listingId: string, orderedIds: string[]): Promise<void> {
  return apiClient<void>(`/listings/${listingId}/images/order`, {
    method: 'PATCH',
    body: { imageIds: orderedIds },
    auth: true,
  });
}

