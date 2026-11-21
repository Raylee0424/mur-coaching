import { describe, expect, it } from 'vitest';
import type { ExerciseDto } from '@coaching/shared';
import { equipmentOptions, filterExercises, groupCounts } from './picker-model';

const ex = (name: string, muscleGroup: ExerciseDto['muscleGroup'], equipment: string | null) => ({ id: name, name, muscleGroup, equipment }) as ExerciseDto;
const lib = [ex('Back Squat', 'QUADS', 'Barbell'), ex('Bench Press', 'CHEST', 'barbell'), ex('Split Squat', 'QUADS', 'Dumbbell'), ex('Plank', 'CORE', null)];

describe('filterExercises', () => {
  it('combines search, muscle group and equipment', () => {
    expect(filterExercises(lib, { q: '', group: '', equipment: '' })).toHaveLength(4);
    expect(filterExercises(lib, { q: 'squat', group: '', equipment: '' }).map((e) => e.name)).toEqual(['Back Squat', 'Split Squat']);
    expect(filterExercises(lib, { q: 'squat', group: 'QUADS', equipment: 'dumbbell' }).map((e) => e.name)).toEqual(['Split Squat']);
    expect(filterExercises(lib, { q: '', group: '', equipment: 'Barbell' }).map((e) => e.name)).toEqual(['Back Squat', 'Bench Press']);
    expect(filterExercises(lib, { q: 'zzz', group: '', equipment: '' })).toEqual([]);
  });
});

describe('chip data', () => {
  it('counts only groups that exist', () => {
    expect(groupCounts(lib, ['CHEST', 'QUADS', 'BACK', 'CORE'])).toEqual([
      { group: 'CHEST', count: 1 },
      { group: 'QUADS', count: 2 },
      { group: 'CORE', count: 1 },
    ]);
  });
  it('de-duplicates equipment ignoring case', () => {
    expect(equipmentOptions(lib)).toEqual(['Barbell', 'Dumbbell']);
  });
});
