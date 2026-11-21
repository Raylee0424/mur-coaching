import { describe, expect, it } from 'vitest';
import type { ExerciseDto } from '@coaching/shared';
import { EMPTY_DRAFT, draftFromExercise, formatOverrides, formatRepRange, validateExercise } from './exercise-model';

const good = { ...EMPTY_DRAFT, name: ' Romanian Deadlift ', muscleGroup: 'HAMSTRINGS' as const };

describe('validateExercise', () => {
  it('accepts a minimal draft and sends nulls for inherited rules', () => {
    const r = validateExercise(good);
    expect(r).toEqual({
      ok: true,
      body: { name: 'Romanian Deadlift', muscleGroup: 'HAMSTRINGS', equipment: '', loadIncrementKg: 2.5, rpeCap: null, repsMin: null, repsMax: null },
    });
  });

  it('rejects an out-of-range RPE cap', () => {
    const r = validateExercise({ ...good, rpeCap: '10.5' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.rpeCap).toContain('between 5.0 and 10.0');
  });

  it('needs both rep bounds or neither, in order', () => {
    expect(validateExercise({ ...good, repsMin: '4' }).ok).toBe(false);
    const r = validateExercise({ ...good, repsMin: '8', repsMax: '4' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.repsMax).toBe('Must be at least the minimum.');
    expect(validateExercise({ ...good, repsMin: '4', repsMax: '6', rpeCap: '8.5' }).ok).toBe(true);
  });

  it('requires name and muscle group', () => {
    const r = validateExercise(EMPTY_DRAFT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors)).toEqual(['name', 'muscleGroup']);
  });
});

describe('display helpers', () => {
  const ex = { name: 'Squat', muscleGroup: 'QUADS', equipment: null, loadIncrementKg: '2.50', rpeCap: '8.5', repsMin: 4, repsMax: 6 } as ExerciseDto;
  it('round-trips an exercise into a draft', () => {
    expect(draftFromExercise(ex)).toMatchObject({ loadIncrementKg: '2.5', rpeCap: '8.5', repsMin: '4', repsMax: '6', equipment: '' });
  });
  it('formats ranges and override counts', () => {
    expect(formatRepRange(ex)).toBe('4–6');
    expect(formatRepRange({ repsMin: null, repsMax: null })).toBe('—');
    expect(formatRepRange({ repsMin: 5, repsMax: 5 })).toBe('5');
    expect(formatOverrides(0)).toBe('0');
    expect(formatOverrides(1)).toBe('1 client');
    expect(formatOverrides(3)).toBe('3 clients');
  });
});
