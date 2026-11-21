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
};

/** Counts per status for the month (used for the summary line under the calendar). */
export function countStatuses(days: readonly CalendarDay[]): Record<CalendarDayStatus, number> {
  const out: Record<CalendarDayStatus, number> = { COMPLETED: 0, MISSED: 0, HIGH_RPE: 0, SCHEDULED: 0, TODAY: 0 };
  for (const d of days) if (d.status) out[d.status] += 1;
  return out;
}

/** First upcoming session (today or later) in the given days, if any. */
export function nextSession(days: readonly CalendarDay[]): CalendarDay | null {
  return days.find((d) => d.status === 'TODAY' || d.status === 'SCHEDULED') ?? null;
}
