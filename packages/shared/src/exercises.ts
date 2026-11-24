import type { Equipment, ExercisePosition, MovementPattern, MuscleGroup, MuscleRole, ResistanceProfile } from './enums';
import type { DecimalString, IsoDateString } from './common';
import type { LimitationFlag } from './limitations';

export interface ExerciseMuscleDto {
  muscle: MuscleGroup;
  role: MuscleRole;
}

export interface ExerciseDto {
  id: string;
  name: string;
  /** Main primary muscle. Always present in `muscles` as PRIMARY. */
  muscleGroup: MuscleGroup;
  /** Every muscle trained, primaries first. */
  muscles: ExerciseMuscleDto[];
  equipment: Equipment | null;
  pattern: MovementPattern | null;
  profile: ResistanceProfile | null;
  position: ExercisePosition | null;
  loadIncrementKg: DecimalString;
  /** Exercise-level engine rules; null = inherit. */
  rpeCap: DecimalString | null;
  repsMin: number | null;
  repsMax: number | null;
  /** https link to a demo video, or null. */
  demoUrl: string | null;
  /** Always null in list results (archived exercises are hidden). */
  archivedAt: IsoDateString | null;
  /**
   * Coach lists only (0 for clients): how many of the coach's clients have logged this exercise AND carry
   * per-client engine overrides. There is no per-exercise client override, so this is the set of clients
   * whose own overrides can take precedence over the exercise rules.
   */
  overrideClientCount: number;
  /** Set when a coach owns it. Global when both coachId and ownerId are null. */
  coachId: string | null;
  /** Set when an athlete owns it (their own custom exercise). */
  ownerId: string | null;
  /** Client lists only: the active limitation covering this exercise today; always null for coaches. */
  limitation: LimitationFlag | null;
  createdAt: IsoDateString;
}

export interface CreateExerciseRequest {
  name: string;
  /** Main primary muscle. */
  muscleGroup: MuscleGroup;
  /** Extra muscles. `muscleGroup` is always stored as PRIMARY, whatever this says about it. */
  muscles?: ExerciseMuscleDto[];
  equipment?: Equipment | null;
  pattern?: MovementPattern | null;
  profile?: ResistanceProfile | null;
  position?: ExercisePosition | null;
  loadIncrementKg?: number;
  rpeCap?: number | null;
  /** Both rep bounds are set together or both null. */
  repsMin?: number | null;
  repsMax?: number | null;
  /** https URL, max 300 chars; null clears it. */
  demoUrl?: string | null;
}

export type UpdateExerciseRequest = Partial<CreateExerciseRequest>;

export interface ExerciseAlternativeDto {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment | null;
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
  /** Matches any muscle the exercise trains, primary or secondary. */
  muscleGroup?: MuscleGroup;
  equipment?: Equipment;
  profile?: ResistanceProfile;
  q?: string;
}
