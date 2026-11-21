import type { ProgramTreeInput, WorkoutExerciseInput } from '@coaching/shared';

/** Current program shape: just the ids, by workout. */
export interface ExistingTree {
  workouts: { id: string; exercises: { id: string }[] }[];
}

export interface WorkoutFields {
  weekNumber: number;
  dayNumber: number;
  name: string;
}

export interface ExerciseFields {
  exerciseId: string;
  order: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetRpe: number | null;
  restSeconds: number | null;
  notes: string | null;
}

/** `workoutRef` is an existing workout id or `new:<index>` for a workout created in the same sync. */
export interface TreePlan {
  deleteWorkoutIds: string[];
  deleteExerciseIds: string[];
  updateWorkouts: ({ id: string } & WorkoutFields)[];
  createWorkouts: ({ ref: string } & WorkoutFields)[];
  updateExercises: ({ id: string; workoutRef: string } & ExerciseFields)[];
  createExercises: ({ workoutRef: string } & ExerciseFields)[];
}

export type PlanResult = { ok: true; plan: TreePlan } | { ok: false; error: string };

const exerciseFields = (e: WorkoutExerciseInput, order: number): ExerciseFields => ({
  exerciseId: e.exerciseId,
  order,
  targetSets: e.targetSets,
  targetRepsMin: e.targetRepsMin,
  targetRepsMax: e.targetRepsMax,
  targetRpe: e.targetRpe ?? null,
  restSeconds: e.restSeconds ?? null,
  notes: e.notes?.trim() || null,
});

/**
 * Pure: validates the submitted tree against the current one and plans the writes. Ids keep rows (and the
 * workout-log → prescription links the engine needs); id-less nodes are created; omitted ones are deleted.
 * An exercise id may move to another workout of the same program.
 */
export function planTreeSync(existing: ExistingTree, input: ProgramTreeInput): PlanResult {
  const knownWorkouts = new Set(existing.workouts.map((w) => w.id));
  const knownExercises = new Set(existing.workouts.flatMap((w) => w.exercises.map((e) => e.id)));

  const slots = new Set<string>();
  const seenWorkoutIds = new Set<string>();
  const seenExerciseIds = new Set<string>();
  const plan: TreePlan = {
    deleteWorkoutIds: [],
    deleteExerciseIds: [],
    updateWorkouts: [],
    createWorkouts: [],
    updateExercises: [],
    createExercises: [],
  };

  for (const [i, w] of input.workouts.entries()) {
    const label = `Week ${w.weekNumber} day ${w.dayNumber}`;
    if (w.weekNumber < 1 || w.weekNumber > input.durationWeeks) {
      return { ok: false, error: `${label}: week is outside the program's ${input.durationWeeks} weeks` };
    }
    const slot = `${w.weekNumber}:${w.dayNumber}`;
    if (slots.has(slot)) return { ok: false, error: `${label} appears twice` };
    slots.add(slot);

    let ref: string;
    const fields: WorkoutFields = { weekNumber: w.weekNumber, dayNumber: w.dayNumber, name: w.name.trim() };
    if (w.id) {
      if (!knownWorkouts.has(w.id)) return { ok: false, error: `${label}: unknown workout id` };
      if (seenWorkoutIds.has(w.id)) return { ok: false, error: `${label}: workout id used twice` };
      seenWorkoutIds.add(w.id);
      plan.updateWorkouts.push({ id: w.id, ...fields });
      ref = w.id;
    } else {
      ref = `new:${i}`;
      plan.createWorkouts.push({ ref, ...fields });
    }

    for (const [j, e] of w.exercises.entries()) {
      if (e.targetRepsMin > e.targetRepsMax) return { ok: false, error: `${label}: rep range minimum exceeds maximum` };
      const f = exerciseFields(e, j + 1);
      if (e.id) {
        if (!knownExercises.has(e.id)) return { ok: false, error: `${label}: unknown prescription id` };
        if (seenExerciseIds.has(e.id)) return { ok: false, error: `${label}: prescription id used twice` };
        seenExerciseIds.add(e.id);
        plan.updateExercises.push({ id: e.id, workoutRef: ref, ...f });
      } else {
        plan.createExercises.push({ workoutRef: ref, ...f });
      }
    }
  }

  for (const w of existing.workouts) {
    if (!seenWorkoutIds.has(w.id)) plan.deleteWorkoutIds.push(w.id);
    for (const e of w.exercises) {
      // Exercises of a deleted workout cascade unless they moved elsewhere.
      if (!seenExerciseIds.has(e.id) && seenWorkoutIds.has(w.id)) plan.deleteExerciseIds.push(e.id);
    }
  }
  return { ok: true, plan };
}

/** Distinct exercise ids referenced by the tree (for the visibility check). */
export const referencedExerciseIds = (input: ProgramTreeInput): string[] => [
  ...new Set(input.workouts.flatMap((w) => w.exercises.map((e) => e.exerciseId))),
];
