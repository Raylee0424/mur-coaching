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
}

export interface WorkoutLogDto {
  id: string;
  clientId: string;
  assignmentId: string | null;
  workoutId: string | null;
  performedAt: IsoDateString;
  notes: string | null;
  createdAt: IsoDateString;
  exerciseLogs: ExerciseLogDto[];
}

export interface SetLogInput {
  reps: number;
  weightKg: number;
  rpe?: number;
  isWarmup?: boolean;
}

export interface ExerciseLogInput {
  exerciseId: string;
  workoutExerciseId?: string;
  /** Exercise the client swapped away from; requires swapReason. */
  swappedFromExerciseId?: string;
  swapReason?: SwapReason;
  swapNote?: string;
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
} as const;
