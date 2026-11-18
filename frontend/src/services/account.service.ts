import { apiClient, downloadWithAuth } from './api-client';
import type { User } from './auth.service';

export interface ProfileData {
  displayName: string;
  /** Empty clears it. */
  bio: string;
  /** International format (+963…), or empty to clear it. */
  phone: string;
}

export function updateProfile(data: ProfileData): Promise<User> {
  return apiClient<User>('/users/me', { method: 'PATCH', body: data, auth: true });
}

/** Every other session is signed out; the returned token replaces ours. */
export function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ accessToken: string }> {
  return apiClient('/users/me/password', {
    method: 'POST',
    body: { currentPassword, newPassword },
    auth: true,
  });
}

/** Saves a JSON file with everything the account holds. */
export function downloadMyData(): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  return downloadWithAuth('/users/me/export', `marketplace-data-${day}.json`);
}

export function deleteAccount(password: string): Promise<{ message: string }> {
  return apiClient('/users/me', { method: 'DELETE', body: { password }, auth: true });
}
