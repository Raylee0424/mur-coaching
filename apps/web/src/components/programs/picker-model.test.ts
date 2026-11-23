import { describe, expect, it } from 'vitest';
import type { ExerciseDto } from '@coaching/shared';
import { equipmentOptions, filterExercises, groupCounts } from './picker-model';

const ex = (name: string, muscleGroup: ExerciseDto['muscleGroup'], equipment: ExerciseDto['equipment']) => ({ id: name, name, muscleGroup, equipment }) as ExerciseDto;
const lib = [ex('Back Squat', 'QUADS', 'BARBELL'), ex('Bench Press', 'CHEST', 'BARBELL'), ex('Split Squat', 'QUADS', 'DUMBBELL'), ex('Plank', 'CORE', null)];

describe('filterExercises', () => {
  it('combines search, muscle group and equipment', () => {
    expect(filterExercises(lib, { q: '', group: '', equipment: '' })).toHaveLength(4);
    expect(filterExercises(lib, { q: 'squat', group: '', equipment: '' }).map((e) => e.name)).toEqual(['Back Squat', 'Split Squat']);
    expect(filterExercises(lib, { q: 'squat', group: 'QUADS', equipment: 'DUMBBELL' }).map((e) => e.name)).toEqual(['Split Squat']);
    expect(filterExercises(lib, { q: '', group: '', equipment: 'BARBELL' }).map((e) => e.name)).toEqual(['Back Squat', 'Bench Press']);
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
  it('lists present equipment once, in enum order', () => {
    expect(equipmentOptions(lib)).toEqual(['BARBELL', 'DUMBBELL']);
  });
});
