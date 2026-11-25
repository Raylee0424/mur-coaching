import { describe, expect, it } from 'vitest';
import type { MuscleGroup, WorkoutLogDto } from '@coaching/shared';
import {
  availableFilters,
  formatVolume,
  groupByWeek,
  isPrSession,
  lastTimeDeltaKg,
  pickLog,
  recordCount,
  sessionSplit,
  sessionTitle,
  sessionVolumeKg,
  weekLabel,
  weekStart,
  workingSetCount,
} from './history-model';

type SetSpec = [reps: number, kg: string, opts?: { warm?: boolean; pr?: boolean }];

const lift = (exerciseId: string, muscleGroup: MuscleGroup, sets: SetSpec[]) => ({
  id: `el-${exerciseId}`,
  workoutLogId: 'x',
  exerciseId,
  workoutExerciseId: null,
  order: 1,
  exercise: { id: exerciseId, name: exerciseId, muscleGroup },
  swappedFromExerciseId: null,
  swapReason: null,
  swappedFrom: null,
  notes: null,
  sets: sets.map(([reps, kg, o], i) => ({
    id: `${exerciseId}-${i}`,
    exerciseLogId: 'x',
    setNumber: i + 1,
    reps,
    weightKg: kg,
    rpe: null,
    isWarmup: o?.warm ?? false,
    rir: null,
    tempo: null,
    restSeconds: null,
    personalRecord: o?.pr ? { id: `pr-${exerciseId}-${i}` } : null,
  })),
});

const log = (id: string, performedAt: string, exerciseLogs: ReturnType<typeof lift>[], workout: string | null = null): WorkoutLogDto => ({
  id,
  clientId: 'c',
  assignmentId: null,
  workoutId: workout ? 'w' : null,
  workout: workout ? { id: 'w', name: workout } : null,
  performedAt,
  notes: null,
  loggedById: null,
  createdAt: performedAt,
  exerciseLogs,
});

const bench = (kg: string, opts?: { pr?: boolean }) => lift('bench', 'CHEST', [[5, '40.00', { warm: true }], [8, kg, opts], [8, kg]]);
const squat = (kg: string) => lift('squat', 'QUADS', [[5, kg], [5, kg]]);

describe('volume and set totals', () => {
  it('counts working sets only', () => {
    const l = log('a', '2026-11-20T10:00:00Z', [bench('100.00'), squat('120.00')]);
    expect(workingSetCount(l)).toBe(4);
    // 2 × 8 × 100 + 2 × 5 × 120; the 40 kg warm-up is left out.
    expect(sessionVolumeKg(l)).toBe(2800);
  });

  it('formats volume in the athlete unit as whole numbers', () => {
    expect(formatVolume(2800, 'KG')).toBe('2,800 kg');
    expect(formatVolume(1000, 'LB')).toBe('2,205 lb');
  });

  it('handles decimal string weights without float drift', () => {
    const l = log('a', '2026-11-20T10:00:00Z', [lift('curl', 'BICEPS', [[10, '12.50'], [10, '12.50'], [10, '12.50']])]);
    expect(sessionVolumeKg(l)).toBe(375);
  });
});

describe('week grouping', () => {
  it('starts weeks on Monday in UTC', () => {
    expect(weekStart('2026-11-16T00:00:00Z')).toBe('2026-11-16'); // Monday
    expect(weekStart('2026-11-22T23:59:00Z')).toBe('2026-11-16'); // Sunday
    expect(weekStart('2026-11-23T00:00:00Z')).toBe('2026-11-23');
    expect(weekLabel('2026-11-16')).toBe('WEEK OF NOV 16, 2026');
  });

  it('groups newest-first logs by week and sums each week', () => {
    const logs = [
      log('d', '2026-11-24T10:00:00Z', [bench('100.00')]),
      log('c', '2026-11-21T10:00:00Z', [squat('100.00')]),
      log('b', '2026-11-18T10:00:00Z', [bench('97.50')]),
      log('a', '2026-11-10T10:00:00Z', [squat('95.00')]),
    ];
    const groups = groupByWeek(logs);
    expect(groups.map((g) => [g.weekStart, g.logs.map((l) => l.id)])).toEqual([
      ['2026-11-23', ['d']],
      ['2026-11-16', ['c', 'b']],
      ['2026-11-09', ['a']],
    ]);
    expect(groups[1]!.volumeKg).toBe(1000 + 1560);
  });

  it('returns no groups for no logs', () => {
    expect(groupByWeek([])).toEqual([]);
  });
});

describe('filters', () => {
  it('splits by primary muscle of most working sets, mixed is neither', () => {
    expect(sessionSplit(log('u', '2026-11-20T10:00:00Z', [bench('100.00')]))).toBe('UPPER');
    expect(sessionSplit(log('l', '2026-11-20T10:00:00Z', [squat('100.00')]))).toBe('LOWER');
    expect(sessionSplit(log('m', '2026-11-20T10:00:00Z', [bench('100.00'), squat('100.00')]))).toBeNull();
    expect(sessionSplit(log('c', '2026-11-20T10:00:00Z', [lift('plank', 'CORE', [[1, '0.00']])]))).toBeNull();
  });

  it('flags PR sessions and counts records', () => {
    const pr = log('p', '2026-11-20T10:00:00Z', [bench('105.00', { pr: true })]);
    const plain = log('q', '2026-11-19T10:00:00Z', [squat('100.00')]);
    expect(isPrSession(pr)).toBe(true);
    expect(isPrSession(plain)).toBe(false);
    expect(recordCount([pr, plain])).toBe(1);
  });

  it('offers only filters the loaded sessions can back', () => {
    expect(availableFilters([log('l', '2026-11-20T10:00:00Z', [squat('100.00')])])).toEqual(['all', 'lower']);
    expect(availableFilters([log('p', '2026-11-20T10:00:00Z', [bench('105.00', { pr: true })])])).toEqual(['all', 'upper', 'pr']);
  });
});

describe('session detail', () => {
  const logs = [
    log('c', '2026-11-24T10:00:00Z', [bench('102.50')], 'Upper A'),
    log('b', '2026-11-21T10:00:00Z', [squat('100.00')]),
    log('a', '2026-11-18T10:00:00Z', [bench('100.00')]),
  ];

  it('compares against the previous session that trained the lift', () => {
    expect(lastTimeDeltaKg(logs[0]!, 'bench', logs)).toBe(2.5);
    expect(lastTimeDeltaKg(logs[2]!, 'bench', logs)).toBeNull();
    expect(lastTimeDeltaKg(logs[1]!, 'squat', logs)).toBeNull();
  });

  it('titles by program day, else the lifts', () => {
    expect(sessionTitle(logs[0]!)).toBe('Upper A');
    expect(sessionTitle(logs[1]!)).toBe('squat');
  });

  it('picks the requested log, else the newest', () => {
    expect(pickLog(logs, 'b')?.id).toBe('b');
    expect(pickLog(logs, 'missing')?.id).toBe('c');
    expect(pickLog([], undefined)).toBeNull();
  });
});
