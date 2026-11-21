import type { RecommendationAction } from '@coaching/shared';

export interface SetInput {
  reps: number;
  weightKg: number;
  rpe: number | null;
  isWarmup: boolean;
}

/** One performed exercise within one session (an ExerciseLog). */
export interface SessionInput {
  exerciseLogId: string;
  performedAt: Date;
  sets: readonly SetInput[];
}

/** Targets the client was working to (from the WorkoutExercise) plus the exercise's load step. */
export interface Prescription {
  targetSets: number;
  repsMin: number;
  repsMax: number;
  targetRpe: number | null;
  loadIncrementKg: number;
}

export interface SessionMetrics {
  exerciseLogId: string;
  performedAt: string;
  workingSets: number;
  volumeKg: number;
  topWeightKg: number;
  /** Reps of the best set at topWeightKg. */
  topSetReps: number;
  /** Epley estimate from the top set. */
  e1rmKg: number;
  avgRpe: number | null;
}

export interface RecommendationDraft {
  action: RecommendationAction;
  recommendedWeightKg: number | null;
  recommendedRepsMin: number | null;
  recommendedRepsMax: number | null;
  recommendedSets: number | null;
  reason: string;
  /** Oldest → newest, the sessions the decision used. */
  metrics: SessionMetrics[];
  sourceExerciseLogIds: string[];
}
