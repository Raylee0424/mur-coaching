import { describe, expect, it } from 'vitest';
import type { WorkoutLogDto } from '@coaching/shared';
import { applySetEdit } from './edit-log-model';

const set = (id: string, reps: number, kg: string, rpe: string | null, warm = false) => ({
  id,
  exerciseLogId: 'x',
  setNumber: 1,
  reps,
  weightKg: kg,
  rpe,
  isWarmup: warm,
});

const log: WorkoutLogDto = {
  id: 'l1',
  clientId: 'c1',
  assignmentId: 'a1',
  workoutId: 'w1',
  performedAt: '2026-11-20T10:00:00.000Z',
  notes: null,
  createdAt: '2026-11-20T10:00:00.000Z',
  exerciseLogs: [
    {
      id: 'e1',
      workoutLogId: 'l1',
      exerciseId: 'bench',
      workoutExerciseId: 'we1',
      order: 1,
      exercise: { id: 'bench', name: 'Bench' },
      swappedFromExerciseId: null,
      swapReason: null,
      swappedFrom: null,
      sets: [set('s1', 5, '60.00', null, true), set('s2', 8, '100.00', '8.5')],
    },
    {
      id: 'e2',
      workoutLogId: 'l1',
      exerciseId: 'legpress',
      workoutExerciseId: null,
      order: 2,
      exercise: { id: 'legpress', name: 'Leg press' },
      swappedFromExerciseId: 'squat',
      swapReason: 'Pain: left knee',
      swappedFrom: { id: 'squat', name: 'Squat' },
      sets: [set('s3', 10, '150.00', '8')],
    },
  ],
};

describe('applySetEdit', () => {
  it('changes one set and keeps prescription links and swaps', () => {
    const r = applySetEdit(log, { setId: 's2', kind: 'save', values: { weightKg: 102.5, reps: 7, rpe: null, isWarmup: false } });
    expect(r).toEqual({
      kind: 'update',
      body: {
        exerciseLogs: [
          {
            exerciseId: 'bench',
            workoutExerciseId: 'we1',
            sets: [
              { reps: 5, weightKg: 60, isWarmup: true },
              { reps: 7, weightKg: 102.5 },
            ],
          },
          {
            exerciseId: 'legpress',
            swappedFromExerciseId: 'squat',
            swapReason: 'PAIN',
            swapNote: 'left knee',
            sets: [{ reps: 10, weightKg: 150, rpe: 8 }],
          },
        ],
      },
    });
  });

  it('drops an exercise whose last set is deleted', () => {
    const r = applySetEdit(log, { setId: 's3', kind: 'delete' });
    expect(r.kind === 'update' && r.body.exerciseLogs?.map((e) => e.exerciseId)).toEqual(['bench']);
  });

  it('asks to delete the session when its last set goes', () => {
    const single: WorkoutLogDto = { ...log, exerciseLogs: [{ ...log.exerciseLogs[1]!, sets: [set('s3', 10, '150.00', '8')] }] };
    expect(applySetEdit(single, { setId: 's3', kind: 'delete' })).toEqual({ kind: 'deleteSession' });
  });
});
