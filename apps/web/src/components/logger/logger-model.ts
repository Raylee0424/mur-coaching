import { WORKOUT_LOG_LIMITS } from '@coaching/shared';
import type { CreateWorkoutLogRequest, ExerciseLogInput, WorkoutLogDto } from '@coaching/shared';
import { toNumber } from '@/lib/format';

/** Draft values stay strings while editing so half-typed numbers are never mangled. */
export interface DraftSet {
  key: string;
  reps: string;
  weightKg: string;
  rpe: string;
  isWarmup: boolean;
}

export interface DraftExercise {
  key: string;
  exerciseId: string;
  /** Prescription this exercise fulfils; lets the engine evaluate the new log. */
  workoutExerciseId?: string;
  sets: DraftSet[];
}

export interface DraftLog {
  /** `datetime-local` value, browser-local time. */
  performedAtLocal: string;
  notes: string;
  assignmentId?: string;
  workoutId?: string;
  exercises: DraftExercise[];
}

export type DraftErrors = Record<string, string>;

export type ValidationResult =
  | { ok: true; request: CreateWorkoutLogRequest }
  | { ok: false; errors: DraftErrors };

let keySeq = 0;
const nextKey = (): string => `k${++keySeq}`;

const pad = (n: number): string => String(n).padStart(2, '0');

/** `YYYY-MM-DDTHH:mm` in the date's local time (the `datetime-local` format). */
export function toLocalInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function blankSet(): DraftSet {
  return { key: nextKey(), reps: '', weightKg: '', rpe: '', isWarmup: false };
}

export function blankExercise(): DraftExercise {
  return { key: nextKey(), exerciseId: '', sets: [blankSet()] };
}

export function emptyDraft(performedAtLocal: string): DraftLog {
  return { performedAtLocal, notes: '', exercises: [blankExercise()] };
}

/** Copies exercises, set values and prescription links from a previous session. */
export function fromLastLog(log: WorkoutLogDto, performedAtLocal: string): DraftLog {
  return {
    performedAtLocal,
    notes: '',
    ...(log.assignmentId ? { assignmentId: log.assignmentId } : {}),
    ...(log.workoutId ? { workoutId: log.workoutId } : {}),
    exercises: log.exerciseLogs.map((exerciseLog) => ({
      key: nextKey(),
      exerciseId: exerciseLog.exerciseId,
      ...(exerciseLog.workoutExerciseId ? { workoutExerciseId: exerciseLog.workoutExerciseId } : {}),
      sets: exerciseLog.sets.map((set) => ({
        key: nextKey(),
        reps: String(set.reps),
        weightKg: String(toNumber(set.weightKg)),
        rpe: set.rpe === null ? '' : String(toNumber(set.rpe)),
        isWarmup: set.isWarmup,
      })),
    })),
  };
}

// ── Immutable edits ──────────────────────────────────────────────────────────

export function addExercise(draft: DraftLog): DraftLog {
  return { ...draft, exercises: [...draft.exercises, blankExercise()] };
}

export function removeExercise(draft: DraftLog, exerciseKey: string): DraftLog {
  return { ...draft, exercises: draft.exercises.filter((e) => e.key !== exerciseKey) };
}

/** Picking a different exercise drops the prescription link: it no longer matches. */
export function setExerciseId(draft: DraftLog, exerciseKey: string, exerciseId: string): DraftLog {
  return mapExercise(draft, exerciseKey, (exercise) => {
    if (exercise.exerciseId === exerciseId) return exercise;
    return { key: exercise.key, exerciseId, sets: exercise.sets };
  });
}

/** New set starts as a copy of the previous one (minus warm-up flag). */
export function addSet(draft: DraftLog, exerciseKey: string): DraftLog {
  return mapExercise(draft, exerciseKey, (exercise) => {
    const last = exercise.sets[exercise.sets.length - 1];
    const next: DraftSet = last ? { ...last, key: nextKey(), isWarmup: false } : blankSet();
    return { ...exercise, sets: [...exercise.sets, next] };
  });
}

export function removeSet(draft: DraftLog, exerciseKey: string, setKey: string): DraftLog {
  return mapExercise(draft, exerciseKey, (exercise) => ({
    ...exercise,
    sets: exercise.sets.filter((s) => s.key !== setKey),
  }));
}

export function patchSet(
  draft: DraftLog,
  exerciseKey: string,
  setKey: string,
  patch: Partial<Omit<DraftSet, 'key'>>,
): DraftLog {
  return mapExercise(draft, exerciseKey, (exercise) => ({
    ...exercise,
    sets: exercise.sets.map((s) => (s.key === setKey ? { ...s, ...patch } : s)),
  }));
}

function mapExercise(draft: DraftLog, key: string, fn: (e: DraftExercise) => DraftExercise): DraftLog {
  return { ...draft, exercises: draft.exercises.map((e) => (e.key === key ? fn(e) : e)) };
}

// ── Validation (mirrors the API DTO via WORKOUT_LOG_LIMITS) ──────────────────

const WHOLE = /^\d+$/;
const DECIMAL_2 = /^\d+(\.\d{1,2})?$/;
const DECIMAL_1 = /^\d+(\.\d)?$/;

export function validateDraft(draft: DraftLog, now: Date): ValidationResult {
  const errors: DraftErrors = {};
  const L = WORKOUT_LOG_LIMITS;

  const performedAt = draft.performedAtLocal ? new Date(draft.performedAtLocal) : null;
  if (!performedAt || Number.isNaN(performedAt.getTime())) {
    errors['performedAt'] = 'Choose a date and time.';
  } else if (performedAt.getTime() > now.getTime()) {
    errors['performedAt'] = 'The session cannot be in the future.';
  }

  if (draft.exercises.length < 1) errors['exercises'] = 'Add at least one exercise.';
  if (draft.exercises.length > L.maxExercises) errors['exercises'] = `At most ${L.maxExercises} exercises.`;

  const exerciseLogs: ExerciseLogInput[] = [];
  draft.exercises.forEach((exercise, i) => {
    const base = `exercises.${i}`;
    if (!exercise.exerciseId) errors[`${base}.exerciseId`] = 'Choose an exercise.';
    if (exercise.sets.length < 1) errors[`${base}.sets`] = 'Add at least one set.';
    if (exercise.sets.length > L.maxSets) errors[`${base}.sets`] = `At most ${L.maxSets} sets.`;

    const sets: ExerciseLogInput['sets'] = [];
    exercise.sets.forEach((set, j) => {
      const key = `${base}.sets.${j}`;
      const reps = set.reps.trim();
      const weight = set.weightKg.trim();
      const rpe = set.rpe.trim();

      if (!WHOLE.test(reps) || Number(reps) > L.maxReps) errors[`${key}.reps`] = `Whole number, 0–${L.maxReps}.`;
      if (!DECIMAL_2.test(weight) || Number(weight) > L.maxWeightKg) {
        errors[`${key}.weightKg`] = `0–${L.maxWeightKg} kg, up to 2 decimals.`;
      }
      if (rpe !== '' && (!DECIMAL_1.test(rpe) || Number(rpe) < L.rpeMin || Number(rpe) > L.rpeMax)) {
        errors[`${key}.rpe`] = `${L.rpeMin}–${L.rpeMax}, up to 1 decimal.`;
      }

      sets.push({
        reps: Number(reps),
        weightKg: Number(weight),
        ...(rpe !== '' ? { rpe: Number(rpe) } : {}),
        ...(set.isWarmup ? { isWarmup: true } : {}),
      });
    });

    exerciseLogs.push({
      exerciseId: exercise.exerciseId,
      ...(exercise.workoutExerciseId ? { workoutExerciseId: exercise.workoutExerciseId } : {}),
      sets,
    });
  });

  if (Object.keys(errors).length > 0 || !performedAt) return { ok: false, errors };

  const notes = draft.notes.trim();
  return {
    ok: true,
    request: {
      ...(draft.assignmentId ? { assignmentId: draft.assignmentId } : {}),
      ...(draft.workoutId ? { workoutId: draft.workoutId } : {}),
      performedAt: performedAt.toISOString(),
      ...(notes ? { notes } : {}),
      exerciseLogs,
    },
  };
}
