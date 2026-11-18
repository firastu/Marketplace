import { apiClient } from './api-client';

/** The logged-in user's own account (from /auth/me, login, register). */
export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  phone: string | null;
  bio?: string | null;
  /** 'user', 'moderator' or 'admin'. */
  role: string;
  isVerified?: boolean;
  createdAt?: string;
  termsAcceptedAt?: string | null;
  termsVersion?: string | null;
}

/** Moderators and admins see the moderation area. */
export function isStaff(user: Pick<User, 'role'> | null | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'moderator';
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  displayName: string;
  /** Consent to the Terms; the server refuses a sign-up without it. */
  acceptTerms: true;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export function register(data: RegisterData): Promise<AuthResponse> {
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

/** Always answers the same way, whether or not the email has an account. */
export function forgotPassword(email: string, locale: string): Promise<{ message: string }> {
  return apiClient('/auth/forgot-password', { method: 'POST', body: { email, locale } });
}

export function resetPassword(token: string, password: string): Promise<{ message: string }> {
  return apiClient('/auth/reset-password', { method: 'POST', body: { token, password } });
}

export function getMe(): Promise<User> {
  return apiClient<User>('/auth/me', { auth: true });
}

export function saveAuth(response: AuthResponse): void {
  localStorage.setItem('token', response.accessToken);
  localStorage.setItem('user', JSON.stringify(response.user));
}

export function saveUser(user: User): void {
  localStorage.setItem('user', JSON.stringify(user));
}

export function saveToken(accessToken: string): void {
  localStorage.setItem('token', accessToken);
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
