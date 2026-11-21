import { parseSwapReason } from '@coaching/shared';
import type { ExerciseLogInput, UpdateWorkoutLogRequest, WorkoutLogDto } from '@coaching/shared';
import { toNumber } from '@/lib/format';

export interface SetValues {
  weightKg: number;
  reps: number;
  rpe: number | null;
  isWarmup: boolean;
}

export type SetEdit = { setId: string; kind: 'save'; values: SetValues } | { setId: string; kind: 'delete' };

export type EditOutcome =
  | { kind: 'update'; body: UpdateWorkoutLogRequest }
  /** Removing the session's last set: the caller asks before deleting the whole session. */
  | { kind: 'deleteSession' };

/**
 * PATCH /workout-logs/:id replaces every exercise log, so the whole session is rebuilt from what was
 * logged, with one set changed or removed. Prescription links and swap notes are carried over.
 * An exercise left with no sets is dropped.
 */
export function applySetEdit(log: WorkoutLogDto, edit: SetEdit): EditOutcome {
  const exerciseLogs: ExerciseLogInput[] = [];
  for (const el of log.exerciseLogs) {
    const sets = el.sets.flatMap((s) => {
      if (s.id !== edit.setId) {
        return [
          {
            reps: s.reps,
            weightKg: toNumber(s.weightKg),
            ...(s.rpe !== null ? { rpe: toNumber(s.rpe) } : {}),
            ...(s.isWarmup ? { isWarmup: true } : {}),
          },
        ];
      }
      if (edit.kind === 'delete') return [];
      const v = edit.values;
      return [{ reps: v.reps, weightKg: v.weightKg, ...(v.rpe !== null ? { rpe: v.rpe } : {}), ...(v.isWarmup ? { isWarmup: true } : {}) }];
    });
    if (sets.length === 0) continue;
    const swap = el.swappedFromExerciseId && el.swapReason ? parseSwapReason(el.swapReason) : null;
    exerciseLogs.push({
      exerciseId: el.exerciseId,
      ...(el.workoutExerciseId ? { workoutExerciseId: el.workoutExerciseId } : {}),
      ...(swap && el.swappedFromExerciseId
        ? { swappedFromExerciseId: el.swappedFromExerciseId, swapReason: swap.reason, ...(swap.note ? { swapNote: swap.note } : {}) }
        : {}),
      sets,
    });
  }
  if (exerciseLogs.length === 0) return { kind: 'deleteSession' };
  return { kind: 'update', body: { exerciseLogs } };
}
