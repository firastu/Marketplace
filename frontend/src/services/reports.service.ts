import { apiClient } from './api-client';

export const REPORT_REASONS = [
  'prohibited_item',
  'scam',
  'counterfeit',
  'offensive',
  'harassment',
  'spam',
  'wrong_category',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export type ReportTargetType = 'listing' | 'user';
export type ReportStatus = 'open' | 'under_review' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  status: ReportStatus;
  createdAt: string;
}

export function createReport(data: {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}): Promise<Report> {
  return apiClient<Report>('/reports', { method: 'POST', body: data, auth: true });
}
