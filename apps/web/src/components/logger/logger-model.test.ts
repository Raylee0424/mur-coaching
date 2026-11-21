import { describe, expect, it } from 'vitest';
import type { WorkoutLogDto } from '@coaching/shared';
import {
  addSet,
  emptyDraft,
  fromLastLog,
  patchSet,
  setExerciseId,
  toLocalInput,
  validateDraft,
  type DraftLog,
} from './logger-model';

const NOW = new Date(2026, 10, 21, 12, 0, 0);
const NOW_LOCAL = toLocalInput(NOW);

const lastLog: WorkoutLogDto = {
  id: 'l1',
  clientId: 'c1',
  assignmentId: 'a1',
  workoutId: 'w1',
  performedAt: '2026-11-14T10:00:00.000Z',
  notes: 'old note',
  createdAt: '2026-11-14T10:00:00.000Z',
  exerciseLogs: [
    {
      id: 'e1',
      workoutLogId: 'l1',
      exerciseId: 'bench',
      workoutExerciseId: 'we1',
      order: 1,
      exercise: { id: 'bench', name: 'Bench' },
      sets: [
        { id: 's1', exerciseLogId: 'e1', setNumber: 1, reps: 8, weightKg: '100.00', rpe: '8.5', isWarmup: false },
        { id: 's2', exerciseLogId: 'e1', setNumber: 2, reps: 5, weightKg: '60.00', rpe: null, isWarmup: true },
      ],
    },
  ],
};

function valid(): DraftLog {
  const d = fromLastLog(lastLog, NOW_LOCAL);
  return d;
}

describe('fromLastLog', () => {
  it('copies prescription ids and normalises numbers, but not the old notes', () => {
    const d = fromLastLog(lastLog, NOW_LOCAL);
    expect(d.assignmentId).toBe('a1');
    expect(d.workoutId).toBe('w1');
    expect(d.notes).toBe('');
    expect(d.exercises[0]?.workoutExerciseId).toBe('we1');
    expect(d.exercises[0]?.sets.map((s) => [s.weightKg, s.reps, s.rpe, s.isWarmup])).toEqual([
      ['100', '8', '8.5', false],
      ['60', '5', '', true],
    ]);
  });
});

describe('validateDraft', () => {
  it('builds the exact request shape', () => {
    const r = validateDraft(valid(), NOW);
    expect(r).toEqual({
      ok: true,
      request: {
        assignmentId: 'a1',
        workoutId: 'w1',
        performedAt: new Date(NOW_LOCAL).toISOString(),
        exerciseLogs: [
          {
            exerciseId: 'bench',
            workoutExerciseId: 'we1',
            sets: [
              { reps: 8, weightKg: 100, rpe: 8.5 },
              { reps: 5, weightKg: 60, isWarmup: true },
            ],
          },
        ],
      },
    });
  });

  it('rejects an empty session', () => {
    const r = validateDraft({ ...valid(), exercises: [] }, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors['exercises']).toBeDefined();
  });

  it('rejects bad reps, rpe, weight precision and missing exercise', () => {
    let d = emptyDraft(NOW_LOCAL);
    const ex = d.exercises[0]!;
    const set = ex.sets[0]!;
    d = patchSet(d, ex.key, set.key, { reps: '1.5', weightKg: '100.123', rpe: '11' });
    const r = validateDraft(d, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual([
        'exercises.0.exerciseId',
        'exercises.0.sets.0.reps',
        'exercises.0.sets.0.rpe',
        'exercises.0.sets.0.weightKg',
      ]);
    }
  });

  it('rejects a future date and a missing date', () => {
    const future = toLocalInput(new Date(NOW.getTime() + 2 * 24 * 60 * 60 * 1000));
    const a = validateDraft({ ...valid(), performedAtLocal: future }, NOW);
    expect(a.ok).toBe(false);
    const b = validateDraft({ ...valid(), performedAtLocal: '' }, NOW);
    expect(b.ok).toBe(false);
  });
});

describe('edits', () => {
  it('changing the exercise clears the prescription link', () => {
    const d = valid();
    const key = d.exercises[0]!.key;
    expect(setExerciseId(d, key, 'bench').exercises[0]?.workoutExerciseId).toBe('we1');
    expect(setExerciseId(d, key, 'squat').exercises[0]?.workoutExerciseId).toBeUndefined();
  });

  it('addSet copies the previous set without the warm-up flag', () => {
    const d = valid();
    const key = d.exercises[0]!.key;
    const sets = addSet(d, key).exercises[0]!.sets;
    expect(sets).toHaveLength(3);
    expect(sets[2]).toMatchObject({ reps: '5', weightKg: '60', isWarmup: false });
  });
});
