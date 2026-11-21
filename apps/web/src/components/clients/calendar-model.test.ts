import { describe, expect, it } from 'vitest';
import type { CalendarDay } from '@coaching/shared';
import { buildMonthGrid, countStatuses, isMonthKey, monthLabel, nextSession, shiftMonth, weekdayIndex } from './calendar-model';

function month(key: string, count: number, status: Partial<Record<number, CalendarDay['status']>> = {}): CalendarDay[] {
  return Array.from({ length: count }, (_, i) => ({
    date: `${key}-${String(i + 1).padStart(2, '0')}`,
    workoutName: status[i + 1] ? 'Lower A' : null,
    workoutId: null,
    status: status[i + 1] ?? null,
    workoutLogId: null,
    performedAt: null,
    topSet: null,
    notes: null,
  }));
}

describe('shiftMonth', () => {
  it('crosses year boundaries', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-11', -12)).toBe('2025-11');
  });
});

describe('isMonthKey', () => {
  it('validates the format', () => {
    expect(isMonthKey('2026-11')).toBe(true);
    expect(isMonthKey('2026-13')).toBe(false);
    expect(isMonthKey('26-11')).toBe(false);
    expect(isMonthKey(undefined)).toBe(false);
  });
});

describe('weekdayIndex', () => {
  it('is Monday-first', () => {
    expect(weekdayIndex('2026-11-02')).toBe(0); // Monday
    expect(weekdayIndex('2026-11-01')).toBe(6); // Sunday
  });
});

describe('buildMonthGrid', () => {
  it('pads Nov 2026 (starts on a Sunday) to 6 Monday-first weeks', () => {
    const grid = buildMonthGrid('2026-11', month('2026-11', 30));
    expect(grid.every((w) => w.length === 7)).toBe(true);
    expect(grid).toHaveLength(6);
    expect(grid[0]?.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(grid[0]?.[6]?.date).toBe('2026-11-01');
    expect(grid[5]?.[0]?.date).toBe('2026-11-30');
    expect(grid[5]?.slice(1)).toEqual([null, null, null, null, null, null]);
  });

  it('needs no padding for February 2027 (28 days from Monday)', () => {
    const grid = buildMonthGrid('2027-02', month('2027-02', 28));
    expect(grid).toHaveLength(4);
    expect(grid.flat().every((c) => c !== null)).toBe(true);
  });

  it('falls back to the first of the month with no days', () => {
    expect(buildMonthGrid('2026-11', []).flat()).toHaveLength(7);
  });
});

describe('statuses', () => {
  const days = month('2026-11', 10, { 2: 'COMPLETED', 4: 'MISSED', 6: 'TODAY', 8: 'SCHEDULED' });
  it('counts per status', () => {
    expect(countStatuses(days)).toEqual({ COMPLETED: 1, MISSED: 1, HIGH_RPE: 0, SCHEDULED: 1, TODAY: 1 });
  });
  it('finds the next session', () => {
    expect(nextSession(days)?.date).toBe('2026-11-06');
    expect(nextSession(month('2026-11', 3))).toBeNull();
  });
});

describe('monthLabel', () => {
  it('formats in UTC', () => {
    expect(monthLabel('2026-11')).toBe('November 2026');
    expect(monthLabel('2026-11', 'short')).toBe('Nov 2026');
  });
});
