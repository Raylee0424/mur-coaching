import { describe, expect, it } from 'vitest';
import { checkScheduleEdit, formulaDate, planScheduleSync, type PlanRow } from './schedule-plan';

const workouts = [
  { id: 'w1', weekNumber: 1, dayNumber: 1 },
  { id: 'w2', weekNumber: 1, dayNumber: 3 },
  { id: 'w3', weekNumber: 2, dayNumber: 1 },
];
const row = (over: Partial<PlanRow> & Pick<PlanRow, 'id' | 'workoutId' | 'date'>): PlanRow => ({ status: 'PLANNED', moved: false, ...over });

describe('formulaDate', () => {
  it('is start + (week - 1) * 7 + (day - 1)', () => {
    expect(formulaDate('2026-11-02', { weekNumber: 1, dayNumber: 1 })).toBe('2026-11-02');
    expect(formulaDate('2026-11-02', { weekNumber: 2, dayNumber: 3 })).toBe('2026-11-11');
  });
});

describe('planScheduleSync', () => {
  const base = { startDate: '2026-11-02', workouts, today: '2026-11-09' };

  it('creates every row for a new assignment', () => {
    const plan = planScheduleSync({ ...base, rows: [], initial: true });
    expect(plan.create.map((c) => c.workoutId)).toEqual(['w1', 'w2', 'w3']);
  });

  it('creates rows for new workouts only when their date is not in the past', () => {
    const plan = planScheduleSync({ ...base, rows: [] });
    expect(plan.create).toEqual([{ workoutId: 'w3', date: '2026-11-09' }]);
  });

  it('re-dates an unmoved future PLANNED row when its workout moved', () => {
    const rows = [row({ id: 'r3', workoutId: 'w3', date: '2026-11-20' })];
    expect(planScheduleSync({ ...base, rows }).redate).toEqual([{ id: 'r3', date: '2026-11-09' }]);
  });

  it('leaves completed, skipped, moved and past rows alone', () => {
    const rows = [
      row({ id: 'a', workoutId: 'w1', date: '2026-11-20', status: 'COMPLETED' }),
      row({ id: 'b', workoutId: 'w2', date: '2026-11-20', status: 'SKIPPED' }),
      row({ id: 'c', workoutId: 'w3', date: '2026-11-20', moved: true }),
    ];
    expect(planScheduleSync({ ...base, rows })).toEqual({ create: [], redate: [] });
    const past = [row({ id: 'p', workoutId: 'w1', date: '2026-11-03' })];
    expect(planScheduleSync({ ...base, rows: past, workouts: [{ id: 'w1', weekNumber: 3, dayNumber: 1 }] }).redate).toEqual([]);
  });
});

describe('checkScheduleEdit', () => {
  const planned = { status: 'PLANNED', date: '2026-11-12' } as const;
  const today = '2026-11-10';
  const none = new Set<string>();

  it('allows moving to a free day today or later', () => {
    expect(checkScheduleEdit({ row: planned, date: '2026-11-14', today, occupied: none })).toBeNull();
    expect(checkScheduleEdit({ row: planned, date: today, today, occupied: none })).toBeNull();
  });
  it('rejects the past, a taken day, bad dates and empty edits', () => {
    expect(checkScheduleEdit({ row: planned, date: '2026-11-09', today, occupied: none })).toMatch(/past/);
    expect(checkScheduleEdit({ row: planned, date: '2026-11-14', today, occupied: new Set(['2026-11-14']) })).toMatch(/already/);
    expect(checkScheduleEdit({ row: planned, date: '2026-02-31', today, occupied: none })).toMatch(/valid/);
    expect(checkScheduleEdit({ row: planned, today, occupied: none })).toMatch(/Nothing/);
  });
  it('never changes a completed session', () => {
    expect(checkScheduleEdit({ row: { status: 'COMPLETED', date: '2026-11-08' }, status: 'SKIPPED', today, occupied: none })).toMatch(/history/);
  });
  it('skips and restores freely, and moves a skipped row only together with a restore', () => {
    const occupied = new Set(['2026-11-12']);
    expect(checkScheduleEdit({ row: planned, status: 'SKIPPED', today, occupied })).toBeNull();
    const skipped = { status: 'SKIPPED', date: '2026-11-12' } as const;
    expect(checkScheduleEdit({ row: skipped, status: 'PLANNED', today, occupied })).toBeNull();
    expect(checkScheduleEdit({ row: skipped, date: '2026-11-15', today, occupied: none })).toMatch(/Restore/);
    expect(checkScheduleEdit({ row: skipped, date: '2026-11-15', status: 'PLANNED', today, occupied: none })).toBeNull();
    expect(checkScheduleEdit({ row: skipped, date: '2026-11-15', status: 'PLANNED', today, occupied: new Set(['2026-11-15']) })).toMatch(/already/);
  });
});
