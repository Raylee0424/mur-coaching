import { describe, expect, it } from 'vitest';
import { WeightUnit, type ExerciseRecordsDto, type RecordCellDto } from '@coaching/shared';
import { bracketLabel, cellLabel, formatCell, formatDeltaPct, formatDeltaWeight, pickExerciseId, trendSeries } from './records-model';

const cell = (weightKg: string, reps: number, setReps = reps): RecordCellDto => ({
  reps, weightKg, setReps, e1rmKg: weightKg, achievedAt: '2026-11-20T10:00:00.000Z',
});
const ex = (exerciseId: string): ExerciseRecordsDto => ({
  exerciseId, exerciseName: exerciseId, cells: [], bestE1rmKg: '100.00', stats: { sets: 0, avgRpe: null, netDeltaPct: null },
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
});
