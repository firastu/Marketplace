import { apiClient } from './api-client';
import type { PublicUser } from './listings.service';

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string;
  reviewer?: PublicUser;
  listing?: { id: string; title: string } | null;
}

export interface Rating {
  average: number;
  count: number;
}

export function getUser(id: string): Promise<PublicUser> {
  return apiClient<PublicUser>(`/users/${id}`);
}

export function getUserReviews(id: string): Promise<Review[]> {
  return apiClient<Review[]>(`/reviews/user/${id}`);
}

export function getUserRating(id: string): Promise<Rating> {
  return apiClient<Rating>(`/reviews/user/${id}/rating`);
}
