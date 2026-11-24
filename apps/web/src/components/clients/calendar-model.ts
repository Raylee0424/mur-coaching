import type { CalendarDay, CalendarDayStatus } from '@coaching/shared';

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isMonthKey(value: string | undefined): value is string {
  return value !== undefined && MONTH_RE.test(value);
}

/** `YYYY-MM` for a date in UTC. */
export function currentMonth(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7);
}

/** Adds (or subtracts) whole months to a `YYYY-MM` key. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const index = y * 12 + (m - 1) + delta;
  const year = Math.floor(index / 12);
  return `${String(year).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}`;
}

export function monthLabel(month: string, style: 'long' | 'short' = 'long'): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: style, year: 'numeric', timeZone: 'UTC' });
}

/** Monday = 0 … Sunday = 6 for a `YYYY-MM-DD` date. */
export function weekdayIndex(date: string): number {
  return (new Date(`${date}T00:00:00.000Z`).getUTCDay() + 6) % 7;
}

/**
 * Monday-first weeks for the month. Cells outside the month are `null`, so every row has exactly 7 cells.
 * Days the API did not return stay `null`-free only when present: the grid never invents sessions.
 */
export function buildMonthGrid(month: string, days: readonly CalendarDay[]): (CalendarDay | null)[][] {
  const first = days[0];
  const lead = first ? weekdayIndex(first.date) : weekdayIndex(`${month}-01`);
  const cells: (CalendarDay | null)[] = [...Array<null>(lead).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (CalendarDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export const DAY_STATUS_LABEL: Record<CalendarDayStatus, string> = {
  COMPLETED: 'Completed',
  MISSED: 'Missed',
  HIGH_RPE: 'High RPE',
  SCHEDULED: 'Planned',
  TODAY: 'Today',
  SKIPPED: 'Skipped',
};

/** Counts per status for the month (used for the summary line under the calendar). */
export function countStatuses(days: readonly CalendarDay[]): Record<CalendarDayStatus, number> {
  const out: Record<CalendarDayStatus, number> = { COMPLETED: 0, MISSED: 0, HIGH_RPE: 0, SCHEDULED: 0, TODAY: 0, SKIPPED: 0 };
  for (const d of days) if (d.status) out[d.status] += 1;
  return out;
}

/** First upcoming session (today or later) in the given days, if any. */
export function nextSession(days: readonly CalendarDay[]): CalendarDay | null {
  return days.find((d) => d.status === 'TODAY' || d.status === 'SCHEDULED') ?? null;
}

// ── Moving sessions ──────────────────────────────────────────────────────────

/** A session the coach may still move or skip: not done, not skipped. */
export const isMovable = (d: CalendarDay | null | undefined): boolean =>
  !!d && !!d.scheduledWorkoutId && (d.status === 'SCHEDULED' || d.status === 'TODAY' || d.status === 'MISSED');

/** A day cell has a session worth selecting (done, planned, missed or skipped). */
export const hasSession = (d: CalendarDay | null | undefined): boolean => !!d && d.status !== null && d.workoutName !== null;

/** Why a session cannot go to `date`, or null when it can. Mirrors the API's rules; the API has the last word. */
export function moveProblem(days: readonly CalendarDay[], from: CalendarDay, date: string, today: string): string | null {
  if (!isMovable(from)) return 'This session cannot be moved.';
  if (date === from.date) return 'It is already on that day.';
  if (date < today) return 'Sessions cannot be moved into the past.';
  const target = days.find((d) => d.date === date);
  if (target && target.status !== null) return 'That day already has a session.';
  return null;
}

/** Calendar after moving a session: the source day empties, the target day takes it (when it is on screen). */
export function applyMove(days: readonly CalendarDay[], scheduledWorkoutId: string, date: string, today: string): CalendarDay[] {
  const from = days.find((d) => d.scheduledWorkoutId === scheduledWorkoutId);
  if (!from) return [...days];
  const blank = (d: CalendarDay): CalendarDay => ({
    ...d,
    workoutName: null,
    workoutId: null,
    scheduledWorkoutId: null,
    status: null,
    workoutLogId: null,
    performedAt: null,
    topSet: null,
    notes: null,
  });
  return days.map((d) => {
    if (d.date === from.date) return blank(d);
    if (d.date === date) {
      return { ...d, workoutName: from.workoutName, workoutId: from.workoutId, scheduledWorkoutId: from.scheduledWorkoutId, status: date === today ? 'TODAY' : 'SCHEDULED' };
    }
    return d;
  });
}

/** Calendar after skipping or restoring a session. Restoring puts it back as planned, today or missed by date. */
export function applyStatus(days: readonly CalendarDay[], scheduledWorkoutId: string, status: 'PLANNED' | 'SKIPPED', today: string): CalendarDay[] {
  return days.map((d) => {
    if (d.scheduledWorkoutId !== scheduledWorkoutId) return d;
    if (status === 'SKIPPED') return { ...d, status: 'SKIPPED' };
    return { ...d, status: d.date < today ? 'MISSED' : d.date === today ? 'TODAY' : 'SCHEDULED' };
  });
}

/** Arrow-key stepping through the visible days: ±1 day, ±7 days. Stays inside the month; null for other keys. */
export function stepDate(date: string, key: string, days: readonly CalendarDay[]): string | null {
  const delta = key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : key === 'ArrowUp' ? -7 : key === 'ArrowDown' ? 7 : 0;
  if (delta === 0) return null;
  const next = new Date(new Date(`${date}T00:00:00.000Z`).getTime() + delta * 86_400_000).toISOString().slice(0, 10);
  return days.some((d) => d.date === next) ? next : date;
}
