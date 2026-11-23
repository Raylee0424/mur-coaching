import type { MuscleGroup } from './enums';
import type { DecimalString, IsoDateString } from './common';
import type { LimitationFlag } from './limitations';

export interface ExerciseDto {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string | null;
  loadIncrementKg: DecimalString;
  /** Exercise-level engine rules; null = inherit. */
  rpeCap: DecimalString | null;
  repsMin: number | null;
  repsMax: number | null;
  /** Always null in list results (archived exercises are hidden). */
  archivedAt: IsoDateString | null;
  /**
   * Coach lists only (0 for clients): how many of the coach's clients have logged this exercise AND carry
   * per-client engine overrides. There is no per-exercise client override, so this is the set of clients
   * whose own overrides can take precedence over the exercise rules.
   */
  overrideClientCount: number;
  /** null = global library; otherwise the owning coach. */
  coachId: string | null;
  createdAt: IsoDateString;
}

export interface CreateExerciseRequest {
  name: string;
  muscleGroup: MuscleGroup;
  equipment?: string;
  loadIncrementKg?: number;
  rpeCap?: number | null;
  /** Both rep bounds are set together or both null. */
  repsMin?: number | null;
  repsMax?: number | null;
}

export type UpdateExerciseRequest = Partial<CreateExerciseRequest>;

export interface ExerciseAlternativeDto {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string | null;
  /** From the client's own latest top set of this exercise; null if never logged. */
  suggested: { weightKg: DecimalString; reps: number; rpe: DecimalString | null; performedAt: IsoDateString } | null;
  /** Active limitation that covers this exercise; AVOID options sort last. */
  limitation: LimitationFlag | null;
}

export interface ExerciseAlternativesDto {
  exercise: { id: string; name: string; muscleGroup: MuscleGroup };
  alternatives: ExerciseAlternativeDto[];
}

export interface ListExercisesQuery {
  muscleGroup?: MuscleGroup;
  q?: string;
}
