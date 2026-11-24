import type { DecimalString, IsoDateString } from './common';
import type { SwapReason } from './enums';

export interface SetLogDto {
  id: string;
  exerciseLogId: string;
  setNumber: number;
  reps: number;
  weightKg: DecimalString;
  rpe: DecimalString | null;
  isWarmup: boolean;
  rir: number | null;
  /** e.g. `3-1-1-0` (eccentric-pause-concentric-top). */
  tempo: string | null;
  restSeconds: number | null;
}

export interface ExerciseLogDto {
  id: string;
  workoutLogId: string;
  exerciseId: string;
  workoutExerciseId: string | null;
  order: number;
  exercise: { id: string; name: string };
  sets: SetLogDto[];
  swappedFromExerciseId: string | null;
  swapReason: string | null;
  swappedFrom: { id: string; name: string } | null;
  notes: string | null;
}

export interface WorkoutLogDto {
  id: string;
  clientId: string;
  assignmentId: string | null;
  workoutId: string | null;
  performedAt: IsoDateString;
  notes: string | null;
  /** Set when a coach logged the session for the client (live or in person). */
  loggedById: string | null;
  createdAt: IsoDateString;
  exerciseLogs: ExerciseLogDto[];
}

export interface SetLogInput {
  reps: number;
  weightKg: number;
  rpe?: number;
  isWarmup?: boolean;
  rir?: number;
  tempo?: string;
  restSeconds?: number;
}

export interface ExerciseLogInput {
  exerciseId: string;
  workoutExerciseId?: string;
  /** Exercise the client swapped away from; requires swapReason. */
  swappedFromExerciseId?: string;
  swapReason?: SwapReason;
  swapNote?: string;
  notes?: string;
  sets: SetLogInput[];
}

export interface CreateWorkoutLogRequest {
  assignmentId?: string;
  workoutId?: string;
  performedAt: IsoDateString;
  notes?: string;
  exerciseLogs: ExerciseLogInput[];
}

export interface UpdateWorkoutLogRequest {
  performedAt?: IsoDateString;
  notes?: string;
  exerciseLogs?: ExerciseLogInput[];
}

export interface ListWorkoutLogsQuery {
  from?: IsoDateString;
  to?: IsoDateString;
  cursor?: string;
  limit?: number;
}

/** Mirrors the API DTO validators. */
export const WORKOUT_LOG_LIMITS = {
  maxExercises: 30,
  maxSets: 50,
  maxReps: 1000,
  maxWeightKg: 9999,
  rpeMin: 1,
  rpeMax: 10,
  rirMax: 10,
  maxRestSeconds: 3600,
  maxNoteLength: 1000,
} as const;

/** Four dash-separated digits or `X` (explosive): `3-1-1-0`, `2-0-X-0`. */
export const TEMPO_PATTERN = /^[0-9X]-[0-9X]-[0-9X]-[0-9X]$/;
