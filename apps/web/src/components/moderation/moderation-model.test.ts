import { describe, expect, it } from 'vitest';
import { REPORT_REASONS, REPORT_REASON_LABELS } from '@coaching/shared';
import type { ModerationPreviewDto } from '@coaching/shared';
import { emptyText, nextStatus, openCountLabel, parseReportTab, previewText, reasonLabel, repeatBadge } from './moderation-model';

const share = (over: Partial<Extract<ModerationPreviewDto, { type: 'SHARED_WORKOUT' }>> = {}): ModerationPreviewDto => ({
  type: 'SHARED_WORKOUT',
  kind: 'TEMPLATE',
  author: { userId: 'u', name: 'Jordan' },
  groupName: 'Crew',
  title: 'Upper A',
  liftCount: 2,
  topLifts: ['Bench Press', 'Row'],
  volumeKg: null,
  caption: null,
  postedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('moderation model', () => {
  it('parses tabs', () => {
    expect(parseReportTab('reviewed')).toBe('reviewed');
    expect(parseReportTab('open')).toBe('open');
    expect(parseReportTab('x')).toBe('open');
    expect(parseReportTab(undefined)).toBe('open');
  });

  it('labels every known reason and falls back for unknown ones', () => {
    for (const r of REPORT_REASONS) expect(reasonLabel(r)).toBe(REPORT_REASON_LABELS[r]);
    expect(reasonLabel('weird')).toBe(REPORT_REASON_LABELS.OTHER);
  });

  it('describes previews', () => {
    expect(previewText({ targetType: 'USER', preview: { type: 'USER', name: 'Jordan' } })).toEqual({ title: 'Jordan', detail: null, gone: false });
    expect(previewText({ targetType: 'GROUP', preview: { type: 'GROUP', name: 'Crew', memberCount: 1 } }).detail).toBe('1 member');
    expect(previewText({ targetType: 'GROUP', preview: { type: 'GROUP', name: 'Crew', memberCount: 4 } }).detail).toBe('4 members');
    expect(previewText({ targetType: 'SHARED_WORKOUT', preview: share() })).toEqual({ title: 'Upper A', detail: 'by Jordan · in Crew · Bench Press, Row', gone: false });
    expect(previewText({ targetType: 'SHARED_WORKOUT', preview: share({ volumeKg: '1200', liftCount: 5 }) }).detail).toBe('by Jordan · in Crew · Bench Press, Row +3 more · 1200 kg');
    expect(previewText({ targetType: 'SHARED_WORKOUT', preview: share({ liftCount: 0, topLifts: [] }) }).detail).toBe('by Jordan · in Crew · Template');
    expect(previewText({ targetType: 'SHARED_WORKOUT', preview: share({ kind: 'SESSION', liftCount: 0, topLifts: [] }) }).detail).toBe('by Jordan · in Crew · Session');
  });

  it('describes missing targets', () => {
    expect(previewText({ targetType: 'USER', preview: null })).toEqual({ title: 'This account no longer exists', detail: null, gone: true });
    expect(previewText({ targetType: 'GROUP', preview: null })).toEqual({ title: 'Content no longer exists', detail: null, gone: true });
    expect(previewText({ targetType: 'SHARED_WORKOUT', preview: null })).toEqual({ title: 'Content no longer exists', detail: null, gone: true });
  });

  it('badges only repeated targets', () => {
    expect(repeatBadge(0)).toBeNull();
    expect(repeatBadge(1)).toBeNull();
    expect(repeatBadge(3)).toBe('3 reports on this');
  });

  it('flips status', () => {
    expect(nextStatus('OPEN')).toEqual({ status: 'REVIEWED', label: 'Mark reviewed', toast: 'Marked reviewed' });
    expect(nextStatus('REVIEWED')).toEqual({ status: 'OPEN', label: 'Reopen', toast: 'Reopened' });
  });

  it('words counts and empty states', () => {
    expect(openCountLabel(4)).toBe('4 open');
    expect(emptyText('open')).toBe('No open reports.');
    expect(emptyText('reviewed')).toBe('No reviewed reports.');
  });
});
