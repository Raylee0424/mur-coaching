import { describe, expect, it } from 'vitest';
import { WeightUnit, type ExerciseRecordsDto, type RecordCellDto } from '@coaching/shared';
import {
  bestSetLabel,
  bracketLabel,
  cellLabel,
  formatE1rm,
  lowestLoggedReps,
  matrixCell,
  formatCell,
  formatDeltaPct,
  formatDeltaWeight,
  pickExerciseId,
  sparkValues,
  trackedLiftsLabel,
  trendSeries,
} from './records-model';

const cell = (weightKg: string, reps: number, setReps = reps): RecordCellDto => ({
  reps, weightKg, setReps, e1rmKg: weightKg, achievedAt: '2026-11-20T10:00:00.000Z',
});
const ex = (exerciseId: string, cells: (RecordCellDto | null)[] = []): ExerciseRecordsDto => ({
  exerciseId, exerciseName: exerciseId, cells, bestE1rmKg: '100.00', best: cell('100.00', 1), trendE1rmKg: [],
  stats: { sets: 0, avgRpe: null, netDeltaPct: null },
});

describe('records-model', () => {
  it('labels brackets', () => expect(bracketLabel(8)).toBe('8RM'));

  it('formats a cell in the athlete unit and dashes an empty one', () => {
    expect(formatCell(cell('184.00', 1), WeightUnit.KG)).toBe('184 kg');
    expect(formatCell(cell('100.00', 1), WeightUnit.LB)).toBe('220.5 lb');
    expect(formatCell(null, WeightUnit.KG)).toBe('—');
  });

  it('explains a bracket filled by a heavier set at more reps', () => {
    expect(cellLabel('Squat', cell('150.00', 3, 5), 3, WeightUnit.KG)).toBe('Squat, 3RM: 150 kg (set for 5 reps)');
    expect(cellLabel('Squat', null, 3, WeightUnit.KG)).toBe('Squat, 3RM: no record yet');
  });

  it('signs deltas', () => {
    expect(formatDeltaPct(6.8)).toEqual({ text: '+6.8%', tone: 'good' });
    expect(formatDeltaPct(-1.2)).toEqual({ text: '−1.2%', tone: 'bad' });
    expect(formatDeltaPct(0)).toEqual({ text: '0%', tone: 'neutral' });
    expect(formatDeltaPct(null).text).toBe('—');
    expect(formatDeltaWeight(11.5, WeightUnit.KG)).toBe('+11.5 kg');
    expect(formatDeltaWeight(-2.5, WeightUnit.KG)).toBe('−2.5 kg');
    expect(formatDeltaWeight(null, WeightUnit.KG)).toBe('—');
  });

  it('falls back to the first exercise when the request is unknown', () => {
    expect(pickExerciseId([ex('a'), ex('b')], 'b')).toBe('b');
    expect(pickExerciseId([ex('a'), ex('b')], 'zzz')).toBe('a');
    expect(pickExerciseId([], 'a')).toBeNull();
  });

  it('converts the trend to display units with UTC labels', () => {
    const [p] = trendSeries([{ logId: 'l', performedAt: '2026-11-02T23:30:00.000Z', e1rmKg: 100, topWeightKg: 90, topSetReps: 5 }], WeightUnit.LB);
    expect(p?.label).toBe('Nov 2');
    expect(p?.value).toBeCloseTo(220.46, 1);
  });

  it('counts tracked lifts', () => {
    expect(trackedLiftsLabel(6)).toBe('6 tracked lifts');
    expect(trackedLiftsLabel(1)).toBe('1 tracked lift');
  });

  it('labels the record set as weight × reps', () => expect(bestSetLabel(cell('150.00', 5), WeightUnit.KG)).toBe('150 kg × 5'));

  it('shows a logged cell, flags it new inside the window', () => {
    const now = new Date('2026-11-25T00:00:00.000Z');
    const c = { ...cell('105.00', 5), achievedAt: '2026-11-20T00:00:00.000Z' };
    expect(matrixCell(c, 5, 5, '122.50', WeightUnit.KG, 30, now)).toEqual({ kind: 'logged', text: '105 kg', isNew: true });
    const old = { ...c, achievedAt: '2026-09-01T00:00:00.000Z' };
    expect(matrixCell(old, 5, 5, '122.50', WeightUnit.KG, 30, now)).toMatchObject({ kind: 'logged', isNew: false });
  });

  it('replaces a bracket filled by a higher-rep set with an Epley estimate', () => {
    const now = new Date('2026-11-25T00:00:00.000Z');
    const tenRepSet = { ...cell('170.00', 10), reps: 1 };
    // 226.67 / (1 + 1/30) = 219.35, shown at the nearest 0.5 kg.
    expect(matrixCell(tenRepSet, 1, 8, '226.67', WeightUnit.KG, 30, now)).toEqual({ kind: 'estimated', text: '~219.5 kg' });
    expect(matrixCell(null, 12, 8, '226.67', WeightUnit.KG, 30, now)).toEqual({ kind: 'none', text: '—' });
  });

  it('keeps the real covering set between logged rep counts', () => {
    const now = new Date('2026-11-25T00:00:00.000Z');
    const nineFromTen = { ...cell('170.00', 10), reps: 9 };
    expect(matrixCell(nineFromTen, 9, 8, '226.67', WeightUnit.KG, 30, now)).toEqual({ kind: 'covered', text: '170 kg', setReps: 10 });
  });

  it('finds the lowest exactly-logged rep count', () => {
    expect(lowestLoggedReps([{ ...cell('170.00', 10), reps: 1 }, null, cell('170.00', 8), cell('170.00', 10)])).toBe(8);
    expect(lowestLoggedReps([null])).toBeNull();
  });

  it('rounds e1RM to a loadable step', () => {
    expect(formatE1rm('226.67', WeightUnit.KG)).toBe('226.5 kg');
    expect(formatE1rm('129.50', WeightUnit.KG)).toBe('129.5 kg');
    expect(formatE1rm('100.00', WeightUnit.LB)).toBe('220 lb');
  });

  it('converts sparkline points to the athlete unit', () => {
    expect(sparkValues(['100.00', '110.00'], WeightUnit.KG)).toEqual([100, 110]);
    expect(sparkValues(['45.359237'], WeightUnit.LB)[0]).toBeCloseTo(100);
  });
});
