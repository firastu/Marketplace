import { apiClient } from './api-client';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  children: Category[];
}

export function getCategories(): Promise<Category[]> {
  return apiClient<Category[]>('/categories');
}
