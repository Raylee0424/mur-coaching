import { describe, expect, it } from 'vitest';
import {
  adherencePct,
  adherenceWindows,
  attentionReasons,
  buildCalendar,
  currentProgramWeek,
  delta,
  markCompleted,
  mean,
  scheduleSlots,
  streaks,
  type CalendarLog,
  type SlotStatus,
} from './analytics';

// Program starts Monday 2026-11-02; days 1,2,4,5 each week.
const START = new Date('2026-11-02T00:00:00Z');
const workouts = [1, 2, 3].flatMap((week) =>
  [1, 2, 4, 5].map((day) => ({ id: `w${week}d${day}`, weekNumber: week, dayNumber: day, name: `Day ${day}` })),
);

describe('scheduleSlots', () => {
  it('places week/day on start + (week-1)*7 + (day-1) and sorts by date', () => {
    const slots = scheduleSlots(START, [...workouts].reverse());
    expect(slots[0]).toMatchObject({ date: '2026-11-02', workoutId: 'w1d1' });
    expect(slots.find((s) => s.workoutId === 'w2d4')?.date).toBe('2026-11-12');
    expect(slots.map((s) => s.date)).toEqual([...slots.map((s) => s.date)].sort());
  });
});

const slotsWith = (done: string[]): SlotStatus[] => markCompleted(scheduleSlots(START, workouts), new Set(done));

describe('adherence', () => {
  const all = workouts.map((w) => w.id);

  it('is completed / scheduled over past days; null with nothing scheduled', () => {
    // Today is Sunday 2026-11-08: week 1 (4 sessions) is past. 3 done.
    const slots = slotsWith(['w1d1', 'w1d2', 'w1d4']);
    expect(adherencePct(slots, '2026-10-12', '2026-11-08', '2026-11-08')).toBe(75);
    expect(adherencePct(slots, '2026-09-01', '2026-09-30', '2026-11-08')).toBeNull();
  });

  it("today's unlogged session is not a miss, but counts once logged", () => {
    const today = '2026-11-02'; // week 1 day 1
    expect(adherencePct(slotsWith([]), '2026-11-02', today, today)).toBeNull();
    expect(adherencePct(slotsWith(['w1d1']), '2026-11-02', today, today)).toBe(100);
  });

  it('computes the 28-day window and the previous one', () => {
    const today = '2026-11-22'; // end of week 3
    const done = all.filter((id) => id !== 'w1d5' && id !== 'w2d5');
    const w = adherenceWindows(slotsWith(done), today);
    // current window 2026-10-26..11-22 covers all 12 sessions, 10 done
    expect(w.current).toBe(83);
    expect(w.previous).toBeNull();
  });
});

describe('streaks', () => {
  it('counts the run ending at the latest session and the best run', () => {
    const today = '2026-11-14'; // after week 2 day 5 = 11-13
    // w1: 1,2 done, 4 missed, 5 done; w2: all done
    const slots = slotsWith(['w1d1', 'w1d2', 'w1d5', 'w2d1', 'w2d2', 'w2d4', 'w2d5']);
    expect(streaks(slots, today)).toEqual({ current: 5, best: 5 });
  });

  it('a miss resets the current run but keeps the best', () => {
    const today = '2026-11-14';
    const slots = slotsWith(['w1d1', 'w1d2', 'w1d4', 'w1d5', 'w2d1', 'w2d2']);
    expect(streaks(slots, today)).toEqual({ current: 0, best: 6 });
  });

  it("an unlogged session today does not break the streak", () => {
    const slots = slotsWith(['w1d1', 'w1d2', 'w1d4', 'w1d5']);
    expect(streaks(slots, '2026-11-09')).toEqual({ current: 4, best: 4 });
  });

  it('empty schedule', () => {
    expect(streaks([], '2026-11-09')).toEqual({ current: 0, best: 0 });
  });
});

describe('program week and small maths', () => {
  it('clamps to the program length and is null before start', () => {
    expect(currentProgramWeek(START, 4, '2026-11-01')).toBeNull();
    expect(currentProgramWeek(START, 4, '2026-11-02')).toBe(1);
    expect(currentProgramWeek(START, 4, '2026-11-09')).toBe(2);
    expect(currentProgramWeek(START, 4, '2027-03-01')).toBe(4);
  });

  it('mean and delta tolerate missing values', () => {
    expect(mean([])).toBeNull();
    expect(mean([8, 9])).toBe(8.5);
    expect(delta(8.5, 8)).toBe(0.5);
    expect(delta(null, 8)).toBeNull();
  });
});

describe('attentionReasons', () => {
  const now = new Date('2026-11-20T12:00:00Z');
  const base = { status: 'ACTIVE' as const, hasStartedAssignment: true, adherencePct: 95, pendingDeload: false, lastSessionAt: new Date('2026-11-18T12:00:00Z'), now };

  it('healthy client has no reasons', () => {
    expect(attentionReasons(base)).toEqual([]);
  });

  it('flags pending deload, adherence under 85 and 7+ days without a session', () => {
    expect(attentionReasons({ ...base, pendingDeload: true })).toEqual(['PENDING_DELOAD']);
    expect(attentionReasons({ ...base, adherencePct: 84 })).toEqual(['LOW_ADHERENCE']);
    expect(attentionReasons({ ...base, adherencePct: 85 })).toEqual([]);
    expect(attentionReasons({ ...base, lastSessionAt: new Date('2026-11-12T12:00:00Z') })).toEqual(['NO_RECENT_SESSION']);
    expect(attentionReasons({ ...base, lastSessionAt: null })).toEqual(['NO_RECENT_SESSION']);
  });

  it('never flags paused clients, and ignores inactivity without a started program', () => {
    expect(attentionReasons({ ...base, status: 'PAUSED', pendingDeload: true })).toEqual([]);
    expect(attentionReasons({ ...base, hasStartedAssignment: false, lastSessionAt: null })).toEqual([]);
  });
});

describe('buildCalendar', () => {
  const slots = scheduleSlots(START, workouts);
  const log = (id: string, workoutId: string | null, iso: string, avgRpe: number | null): CalendarLog => ({
    id,
    workoutId,
    performedAt: new Date(iso),
    notes: id === 'l1' ? 'Felt strong' : null,
    avgRpe,
    workoutName: null,
    topSet: { exerciseId: 'e1', exerciseName: 'Bench', weightKg: '80', reps: 8, rpe: '8' },
  });

  it('marks COMPLETED, HIGH_RPE, MISSED, TODAY, SCHEDULED and rest days', () => {
    const logs = [log('l1', 'w1d1', '2026-11-02T17:00:00Z', 7.5), log('l2', 'w1d2', '2026-11-03T17:00:00Z', 9)];
    const days = buildCalendar('2026-11', slots, logs, '2026-11-05', 8);
    const by = Object.fromEntries(days.map((d) => [d.date, d]));
    expect(days).toHaveLength(30);
    expect(by['2026-11-02']).toMatchObject({ status: 'COMPLETED', workoutName: 'Day 1', notes: 'Felt strong', workoutLogId: 'l1' });
    expect(by['2026-11-02']?.topSet?.reps).toBe(8);
    expect(by['2026-11-03']?.status).toBe('HIGH_RPE');
    expect(by['2026-11-04']?.status).toBeNull(); // rest day (day 3)
    expect(by['2026-11-05']?.status).toBe('TODAY'); // day 4, unlogged
    expect(by['2026-11-06']?.status).toBe('SCHEDULED');
    const missed = buildCalendar('2026-11', slots, logs, '2026-11-08', 8).find((d) => d.date === '2026-11-05');
    expect(missed?.status).toBe('MISSED');
  });

  it('shows a session done late on its scheduled day and ad-hoc sessions on their own day', () => {
    const logs = [log('late', 'w1d4', '2026-11-07T10:00:00Z', 7), log('adhoc', null, '2026-11-04T10:00:00Z', 7)];
    const days = buildCalendar('2026-11', slots, logs, '2026-11-09', 8);
    expect(days.find((d) => d.date === '2026-11-05')).toMatchObject({ status: 'COMPLETED', workoutLogId: 'late' });
    expect(days.find((d) => d.date === '2026-11-04')).toMatchObject({ status: 'COMPLETED', workoutLogId: 'adhoc', workoutName: 'Ad-hoc session' });
  });
});
