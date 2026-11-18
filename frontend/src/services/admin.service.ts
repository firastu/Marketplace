import { apiClient } from './api-client';
import type { Listing, PublicUser } from './listings.service';
import type { Report, ReportStatus } from './reports.service';

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface Person {
  id: string;
  username: string;
  displayName: string | null;
}

export interface AdminStats {
  openReports: number;
  pendingListings: number;
}

export interface AdminReport extends Report {
  details: string | null;
  reporter: Person | null;
  /** Present when the report is about a listing. */
  listing?: { id: string; title: string; status: string; userId: string } | null;
  /** The listing's owner, or the reported user. */
  user?: (Person & { isActive: boolean }) | null;
  openReportsOnTarget: number;
  resolutionNote: string | null;
  resolvedAt: string | null;
}

export interface PendingListing extends Listing {
  moderationFlags: string[];
  user?: PublicUser;
}

export const MODERATION_ACTIONS = [
  'approve_listing',
  'remove_listing',
  'restore_listing',
  'suspend_user',
  'reactivate_user',
  'resolve_report',
  'dismiss_report',
] as const;
export type ModerationActionType = (typeof MODERATION_ACTIONS)[number];

export interface ModerationAction {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  createdAt: string;
  moderator: Person | null;
}

export type ReportFilter = ReportStatus | 'all';

const post = <T>(path: string, body: Record<string, string | undefined>) =>
  apiClient<T>(path, { method: 'POST', body, auth: true });

export function getAdminStats(): Promise<AdminStats> {
  return apiClient<AdminStats>('/admin/stats', { auth: true });
}

export function getAdminReports(status: ReportFilter, page = 1): Promise<Paginated<AdminReport>> {
  return apiClient(`/admin/reports?status=${status}&page=${page}&limit=20`, { auth: true });
}

export function updateReport(
  id: string,
  status: Exclude<ReportStatus, 'open'>,
  note?: string,
): Promise<unknown> {
  return apiClient(`/admin/reports/${id}`, {
    method: 'PATCH',
    body: { status, note: note || undefined },
    auth: true,
  });
}

export function getPendingListings(page = 1): Promise<Paginated<PendingListing>> {
  return apiClient(`/admin/listings/pending?page=${page}`, { auth: true });
}

export function approveListing(id: string, note?: string): Promise<unknown> {
  return post(`/admin/listings/${id}/approve`, { note: note || undefined });
}

export function removeListing(id: string, reason: string): Promise<unknown> {
  return post(`/admin/listings/${id}/remove`, { reason });
}

export function restoreListing(id: string, reason?: string): Promise<unknown> {
  return post(`/admin/listings/${id}/restore`, { reason: reason || undefined });
}

export function suspendUser(id: string, reason: string): Promise<unknown> {
  return post(`/admin/users/${id}/suspend`, { reason });
}

export function reactivateUser(id: string, reason?: string): Promise<unknown> {
  return post(`/admin/users/${id}/reactivate`, { reason: reason || undefined });
}

export function getModerationLog(page = 1): Promise<Paginated<ModerationAction>> {
  return apiClient(`/admin/actions?page=${page}`, { auth: true });
}
