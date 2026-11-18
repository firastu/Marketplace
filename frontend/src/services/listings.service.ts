import { apiClient, uploadWithProgress } from './api-client';
import type { Currency } from '@/utils/format';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';

export type ImageStatus = 'uploaded' | 'processing' | 'ready' | 'failed' | 'deleted';

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
  currency: Currency;
  condition: string;
  status: string;
  locationCity: string | null;
  locationZip: string | null;
  isNegotiable: boolean;
  viewsCount: number;
  createdAt: string;
  categoryId: string;
  userId: string;
  images: ListingImage[];
  category?: { id: string; name: string; nameAr?: string | null; slug: string; icon?: string | null };
  /** Public seller profile only; contact details are never sent. */
  user?: PublicUser;
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  isVerified?: boolean;
  createdAt?: string;
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
  userId?: string;
  currency?: Currency;
  sortBy?: 'newest' | 'price_asc' | 'price_desc';
}

export interface CreateListingData {
  categoryId: string;
  title: string;
  description: string;
  price: number;
  currency?: Currency;
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

/**
 * Link-preview image for a listing: the backend serves the cover photo as a
 * 1200×630 JPEG (chat apps handle WebP unevenly). `v` changes with the
 * cover photo so apps that cache previews pick up a new one.
 */
export function getOgImageUrl(listingId: string, coverImageId: string): string {
  return `${BACKEND_URL}/api/listings/${listingId}/og-image?v=${coverImageId}`;
}

/**
 * Public URL of a resized WebP variant. Originals are private on the server
 * (they can contain the camera's GPS position), so there is no 'original'.
 */
export function getImageUrl(image: ListingImage, variant: 'thumb' | 'medium' | 'large' = 'medium'): string {
  const variantMap: Record<string, string | null> = {
    thumb: image.storageKeyThumb,
    medium: image.storageKeyMedium,
    large: image.storageKeyLarge,
  };
  return buildImageUrl(variantMap[variant] ?? null, image.url);
}

/** thumb (320w) and medium (900w), for responsive <img srcSet>. */
export function getImageSrcSet(image: ListingImage): string | undefined {
  if (!image.storageKeyThumb || !image.storageKeyMedium) return undefined;
  return `${getImageUrl(image, 'thumb')} 320w, ${getImageUrl(image, 'medium')} 900w`;
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
  // Sends the token when logged in so owners can open their own drafts.
  return apiClient<Listing>(`/listings/${id}`, { auth: true });
}

export function getMyListings(): Promise<Listing[]> {
  // Without a limit the API returns the first 20 only, and the page has no
  // pagination, so a seller's older listings were unreachable. 100 is the
  // API maximum.
  return apiClient<PaginatedListings>('/listings/my?limit=100', { auth: true }).then(
    (res) => res.data,
  );
}

export function createListing(data: CreateListingData): Promise<Listing> {
  return apiClient<Listing>('/listings', { method: 'POST', body: data, auth: true });
}

export function updateListing(id: string, data: Partial<CreateListingData>): Promise<Listing> {
  return apiClient<Listing>(`/listings/${id}`, { method: 'PUT', body: data, auth: true });
}

export type OwnerStatus = 'active' | 'reserved' | 'sold';

export function updateListingStatus(id: string, status: OwnerStatus): Promise<Listing> {
  return apiClient<Listing>(`/listings/${id}/status`, {
    method: 'PATCH',
    body: { status },
    auth: true,
  });
}

export function deleteListing(id: string): Promise<void> {
  return apiClient<void>(`/listings/${id}`, { method: 'DELETE', auth: true });
}

export function getListingImages(listingId: string): Promise<ListingImage[]> {
  return apiClient<ListingImage[]>(`/listings/${listingId}/images`, { auth: true });
}

/**
 * Uploads one photo and reports progress (0..1) while the bytes go out.
 * The API reads `primary` from the query string, not the form body.
 */
export function uploadImage(
  listingId: string,
  file: Blob,
  options: { isPrimary?: boolean; onProgress?: (fraction: number) => void; signal?: AbortSignal } = {},
): Promise<ListingImage> {
  const formData = new FormData();
  formData.append('file', file, (file as File).name || 'photo.jpg');
  return uploadWithProgress<ListingImage>(
    `/listings/${listingId}/images${options.isPrimary ? '?primary=true' : ''}`,
    formData,
    options.onProgress,
    options.signal,
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

export function reorderImages(listingId: string, orderedIds: string[]): Promise<ListingImage[]> {
  return apiClient<ListingImage[]>(`/listings/${listingId}/images/order`, {
    method: 'PATCH',
    body: { imageIds: orderedIds },
    auth: true,
  });
}

