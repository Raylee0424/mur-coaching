import { describe, expect, it } from 'vitest';
import type { CalendarDay } from '@coaching/shared';
import { applyMove, applyStatus, buildMonthGrid, countStatuses, moveProblem, stepDate, isMonthKey, monthLabel, nextSession, shiftMonth, weekdayIndex } from './calendar-model';

function month(key: string, count: number, status: Partial<Record<number, CalendarDay['status']>> = {}): CalendarDay[] {
  return Array.from({ length: count }, (_, i) => ({
    date: `${key}-${String(i + 1).padStart(2, '0')}`,
    workoutName: status[i + 1] ? 'Lower A' : null,
    workoutId: null,
    scheduledWorkoutId: status[i + 1] ? `s${i + 1}` : null,
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
    expect(countStatuses(days)).toEqual({ COMPLETED: 1, MISSED: 1, HIGH_RPE: 0, SCHEDULED: 1, TODAY: 1, SKIPPED: 0 });
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

describe('moving sessions', () => {
  const days = month('2026-11', 30, { 10: 'COMPLETED', 12: 'SCHEDULED', 14: 'SCHEDULED', 8: 'MISSED', 9: 'SKIPPED' });
  const at = (n: number): CalendarDay => days[n - 1]!;
  const today = '2026-11-11';

  it('allows a free day today or later and explains every refusal', () => {
    expect(moveProblem(days, at(12), '2026-11-13', today)).toBeNull();
    expect(moveProblem(days, at(12), '2026-11-11', today)).toBeNull();
    expect(moveProblem(days, at(12), '2026-11-10', today)).toMatch(/past/);
    expect(moveProblem(days, at(12), '2026-11-14', today)).toMatch(/already has/);
    expect(moveProblem(days, at(12), '2026-11-12', today)).toMatch(/already on/);
    expect(moveProblem(days, at(10), '2026-11-20', today)).toMatch(/cannot be moved/);
    expect(moveProblem(days, at(9), '2026-11-20', today)).toMatch(/cannot be moved/);
  });
  it('lets a missed session be rescheduled', () => {
    expect(moveProblem(days, at(8), '2026-11-15', today)).toBeNull();
  });
  it('moves the session and recomputes the status for the target day', () => {
    const moved = applyMove(days, 's12', '2026-11-11', today);
    expect(moved[11]).toMatchObject({ status: null, workoutName: null, scheduledWorkoutId: null });
    expect(moved[10]).toMatchObject({ status: 'TODAY', scheduledWorkoutId: 's12', workoutName: 'Lower A' });
    expect(applyMove(days, 's12', '2026-12-02', today)[11]?.status).toBeNull();
  });
  it('skips and restores by date', () => {
    expect(applyStatus(days, 's12', 'SKIPPED', today)[11]?.status).toBe('SKIPPED');
    expect(applyStatus(days, 's9', 'PLANNED', today)[8]?.status).toBe('MISSED');
    expect(applyStatus(days, 's9', 'PLANNED', '2026-11-01')[8]?.status).toBe('SCHEDULED');
  });
  it('steps with the arrow keys and stays inside the month', () => {
    expect(stepDate('2026-11-12', 'ArrowRight', days)).toBe('2026-11-13');
    expect(stepDate('2026-11-12', 'ArrowDown', days)).toBe('2026-11-19');
    expect(stepDate('2026-11-01', 'ArrowLeft', days)).toBe('2026-11-01');
    expect(stepDate('2026-11-12', 'a', days)).toBeNull();
  });
});
