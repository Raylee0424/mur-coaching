import type { AssignmentStatus, MuscleGroup } from './enums';
import type { IsoDateString } from './common';

export interface WorkoutExerciseDto {
  id: string;
  exerciseId: string;
  exercise: { id: string; name: string; muscleGroup: MuscleGroup };
  order: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetRpe: number | null;
  restSeconds: number | null;
  notes: string | null;
}

export interface WorkoutDto {
  id: string;
  weekNumber: number;
  dayNumber: number;
  name: string;
  exercises: WorkoutExerciseDto[];
}

export interface ProgramDto {
  id: string;
  name: string;
  description: string | null;
  durationWeeks: number;
  isTemplate: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  workouts: WorkoutDto[];
  /** Clients with an ACTIVE assignment to this program. */
  activeClientIds: string[];
}

export interface ProgramSummaryDto {
  id: string;
  name: string;
  description: string | null;
  durationWeeks: number;
  isTemplate: boolean;
  /** Distinct training days in week 1. */
  daysPerWeek: number;
  activeAssignments: number;
  updatedAt: IsoDateString;
}

/** Nodes with an `id` update that row (keeping history links); id-less nodes are created; missing ones are deleted. */
export interface WorkoutExerciseInput {
  id?: string;
  exerciseId: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetRpe?: number | null;
  restSeconds?: number | null;
  notes?: string | null;
}

export interface WorkoutInput {
  id?: string;
  weekNumber: number;
  dayNumber: number;
  name: string;
  /** Order = array position. */
  exercises: WorkoutExerciseInput[];
}

export interface ProgramTreeInput {
  name: string;
  description?: string | null;
  durationWeeks: number;
  /** Omit to keep the current value (false on create). */
  isTemplate?: boolean;
  workouts: WorkoutInput[];
}

export interface ListProgramsQuery {
  /** true = templates only, false = non-templates only, omitted = all. */
  template?: boolean;
}

export interface DuplicateProgramRequest {
  /** Defaults to "<name> (copy)". */
  name?: string;
  /** true = save the copy as a template; otherwise the copy is a regular (assignable) program. */
  asTemplate?: boolean;
}

export const PROGRAM_LIMITS = {
  maxWeeks: 52,
  maxWorkouts: 200,
  maxExercisesPerWorkout: 20,
  maxSets: 20,
  maxReps: 50,
  maxRestSeconds: 900,
} as const;

export interface CreateAssignmentRequest {
  programId: string;
  /** `YYYY-MM-DD`. */
  startDate: string;
}

export interface AssignmentDto {
  id: string;
  programId: string;
  clientId: string;
  startDate: IsoDateString;
  status: AssignmentStatus;
}
