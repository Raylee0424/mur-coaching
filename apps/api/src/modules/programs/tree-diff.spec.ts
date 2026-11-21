import { describe, expect, it } from 'vitest';
import type { ProgramTreeInput } from '@coaching/shared';
import { planTreeSync } from './tree-diff';

const rx = (id: string | undefined, exerciseId = 'bench') => ({
  ...(id ? { id } : {}),
  exerciseId,
  targetSets: 3,
  targetRepsMin: 6,
  targetRepsMax: 8,
});

const existing = {
  workouts: [
    { id: 'w1', exercises: [{ id: 'e1' }, { id: 'e2' }] },
    { id: 'w2', exercises: [{ id: 'e3' }] },
  ],
};

const tree = (workouts: ProgramTreeInput['workouts'], durationWeeks = 2): ProgramTreeInput => ({
  name: 'P',
  durationWeeks,
  workouts,
});

describe('planTreeSync', () => {
  it('keeps ids, creates id-less nodes and deletes omitted ones', () => {
    const r = planTreeSync(
      existing,
      tree([
        { id: 'w1', weekNumber: 1, dayNumber: 1, name: ' Upper ', exercises: [rx('e2'), rx(undefined, 'row')] },
        { weekNumber: 1, dayNumber: 3, name: 'New', exercises: [rx(undefined)] },
      ]),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.updateWorkouts).toEqual([{ id: 'w1', weekNumber: 1, dayNumber: 1, name: 'Upper' }]);
    expect(r.plan.createWorkouts).toEqual([{ ref: 'new:1', weekNumber: 1, dayNumber: 3, name: 'New' }]);
    expect(r.plan.updateExercises).toMatchObject([{ id: 'e2', workoutRef: 'w1', order: 1 }]);
    expect(r.plan.createExercises.map((e) => [e.workoutRef, e.order, e.exerciseId])).toEqual([
      ['w1', 2, 'row'],
      ['new:1', 1, 'bench'],
    ]);
    expect(r.plan.deleteWorkoutIds).toEqual(['w2']);
    // e1 removed from a kept workout; e3 goes with its deleted workout (cascade).
    expect(r.plan.deleteExerciseIds).toEqual(['e1']);
  });

  it('lets a prescription move to another workout without losing its id', () => {
    const r = planTreeSync(
      existing,
      tree([
        { id: 'w1', weekNumber: 1, dayNumber: 1, name: 'A', exercises: [rx('e1'), rx('e2')] },
        { id: 'w2', weekNumber: 1, dayNumber: 2, name: 'B', exercises: [rx('e3')] },
        { weekNumber: 2, dayNumber: 1, name: 'C', exercises: [] },
      ]),
    );
    expect(r.ok && r.plan.deleteExerciseIds).toEqual([]);
    const moved = planTreeSync(
      existing,
      tree([
        { id: 'w1', weekNumber: 1, dayNumber: 1, name: 'A', exercises: [rx('e1'), rx('e2'), rx('e3')] },
      ]),
    );
    expect(moved.ok && moved.plan.updateExercises.find((e) => e.id === 'e3')?.workoutRef).toBe('w1');
    expect(moved.ok && moved.plan.deleteWorkoutIds).toEqual(['w2']);
  });

  it('rejects duplicate slots, foreign ids, bad weeks and inverted rep ranges', () => {
    const day = (extra: object) => ({ weekNumber: 1, dayNumber: 1, name: 'A', exercises: [], ...extra });
    expect(planTreeSync(existing, tree([day({}), day({})]))).toMatchObject({ ok: false, error: 'Week 1 day 1 appears twice' });
    expect(planTreeSync(existing, tree([day({ id: 'other' })])).ok).toBe(false);
    expect(planTreeSync(existing, tree([day({ weekNumber: 3 })])).ok).toBe(false);
    expect(planTreeSync(existing, tree([day({ exercises: [{ ...rx('zz') }] })])).ok).toBe(false);
    expect(
      planTreeSync(existing, tree([day({ exercises: [{ ...rx(undefined), targetRepsMin: 9, targetRepsMax: 8 }] })])).ok,
    ).toBe(false);
    expect(planTreeSync(existing, tree([day({ exercises: [rx('e1'), rx('e1')] })])).ok).toBe(false);
  });
});
