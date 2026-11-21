import type { MuscleGroup } from './enums';
import type { DecimalString, IsoDateString } from './common';

export interface ExerciseDto {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string | null;
  loadIncrementKg: DecimalString;
  /** null = global library; otherwise the owning coach. */
  coachId: string | null;
  createdAt: IsoDateString;
}

export interface CreateExerciseRequest {
  name: string;
  muscleGroup: MuscleGroup;
  equipment?: string;
  loadIncrementKg?: number;
}

export type UpdateExerciseRequest = Partial<CreateExerciseRequest>;

export interface ListExercisesQuery {
  muscleGroup?: MuscleGroup;
  q?: string;
}
