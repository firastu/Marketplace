import { apiClient } from './api-client';

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export function register(data: {
  username: string;
  email: string;
  password: string;
  displayName: string;
}): Promise<AuthResponse> {
  return apiClient<AuthResponse>('/auth/register', {
    method: 'POST',
    body: data,
  });
}

export function login(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiClient<AuthResponse>('/auth/login', {
    method: 'POST',
    body: data,
  });
}

export function getMe(): Promise<User> {
  return apiClient<User>('/auth/me', { auth: true });
}

export function saveAuth(response: AuthResponse): void {
  localStorage.setItem('token', response.accessToken);
  localStorage.setItem('user', JSON.stringify(response.user));
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function logout(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('token');
}
