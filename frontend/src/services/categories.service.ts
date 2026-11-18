import { apiClient } from './api-client';

export interface Category {
  id: string;
  /** English name; always present. */
  name: string;
  /** Arabic name, when the category has one. */
  nameAr?: string | null;
  slug: string;
  description: string | null;
  icon: string | null;
  children: Category[];
}

export function getCategories(): Promise<Category[]> {
  return apiClient<Category[]>('/categories');
}
