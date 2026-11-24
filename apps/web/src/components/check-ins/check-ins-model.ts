import { CHECK_IN_LIMITS, CheckInQuestionKind, WEEKDAY_LABELS } from '@coaching/shared';
import type { CheckInAnswer, CheckInQuestionInput, CheckInScheduleDto, InboxCheckInDto } from '@coaching/shared';

export type InboxFilter = 'unreviewed' | 'all';
export const parseInboxFilter = (v: string | undefined): InboxFilter => (v === 'all' ? 'all' : 'unreviewed');

export type CheckInTab = 'inbox' | 'builder' | 'photos';
export const parseCheckInTab = (v: string | undefined): CheckInTab => (v === 'builder' || v === 'photos' ? v : 'inbox');

export function filterInbox(responses: InboxCheckInDto[], filter: InboxFilter): InboxCheckInDto[] {
  return filter === 'all' ? responses : responses.filter((r) => r.reviewedAt === null);
}

export function scheduleLabel(s: Pick<CheckInScheduleDto, 'cadence' | 'weekday' | 'dueDate'>, formatDate: (iso: string) => string): string {
  if (s.cadence === 'WEEKLY') return `Every ${WEEKDAY_LABELS[s.weekday ?? 0]}`;
  return s.dueDate ? `Once · due ${formatDate(s.dueDate)}` : 'Once';
}

export function answerText(a: CheckInAnswer): string {
  if (a.value === null) return 'Skipped';
  if (a.kind === CheckInQuestionKind.SCALE) return `${a.value} / 5`;
  if (a.kind === CheckInQuestionKind.NUMBER && a.unit) return `${a.value} ${a.unit}`;
  return a.value;
}

export const blankQuestion = (): CheckInQuestionInput => ({ prompt: '', kind: CheckInQuestionKind.TEXT, required: true, unit: null });

/** Swaps a question with its neighbour; out-of-range moves return the list unchanged. */
export function moveQuestion<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const to = index + delta;
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[index], next[to]] = [next[to] as T, next[index] as T];
  return next;
}

export const canAddQuestion = (count: number): boolean => count < CHECK_IN_LIMITS.maxQuestions;

/** "18m ago", "2h ago", "3d ago". */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
