import { REPORT_REASONS, REPORT_REASON_LABELS } from '@coaching/shared';
import type { ModerationReportDto, ReportReason, ReportStatus, ReportTarget } from '@coaching/shared';

export type ReportTab = 'open' | 'reviewed';

export const TAB_STATUS: Record<ReportTab, ReportStatus> = { open: 'OPEN', reviewed: 'REVIEWED' };

export function parseReportTab(v: string | undefined): ReportTab {
  return v === 'reviewed' ? 'reviewed' : 'open';
}

/** Reasons are stored as free text; anything the app does not know reads as "Something else". */
export function reasonLabel(reason: string): string {
  return (REPORT_REASONS as readonly string[]).includes(reason) ? REPORT_REASON_LABELS[reason as ReportReason] : REPORT_REASON_LABELS.OTHER;
}

export const TARGET_LABELS: Record<ReportTarget, string> = { USER: 'Profile', GROUP: 'Group', SHARED_WORKOUT: 'Shared workout' };

export function previewText(r: Pick<ModerationReportDto, 'targetType' | 'preview'>): { title: string; detail: string | null; gone: boolean } {
  const p = r.preview;
  if (!p) {
    return { title: r.targetType === 'USER' ? 'This account no longer exists' : 'Content no longer exists', detail: null, gone: true };
  }
  if (p.type === 'USER') return { title: p.name, detail: null, gone: false };
  if (p.type === 'GROUP') return { title: p.name, detail: p.memberCount === 1 ? '1 member' : `${p.memberCount} members`, gone: false };
  const lifts = p.topLifts.length
    ? `${p.topLifts.join(', ')}${p.liftCount > p.topLifts.length ? ` +${p.liftCount - p.topLifts.length} more` : ''}`
    : p.kind === 'TEMPLATE'
      ? 'Template'
      : 'Session';
  const detail = [`by ${p.author.name}`, `in ${p.groupName}`, lifts, p.volumeKg !== null ? `${p.volumeKg} kg` : null].filter(Boolean).join(' · ');
  return { title: p.title, detail, gone: false };
}

export function repeatBadge(n: number): string | null {
  return n > 1 ? `${n} reports on this` : null;
}

export function nextStatus(status: ReportStatus): { status: ReportStatus; label: string; toast: string } {
  return status === 'OPEN'
    ? { status: 'REVIEWED', label: 'Mark reviewed', toast: 'Marked reviewed' }
    : { status: 'OPEN', label: 'Reopen', toast: 'Reopened' };
}

export function openCountLabel(n: number): string {
  return `${n} open`;
}

export function emptyText(tab: ReportTab): string {
  return tab === 'open' ? 'No open reports.' : 'No reviewed reports.';
}
