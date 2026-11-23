import type { Joint, LimitationSeverity, LimitationTarget, MovementPattern, MuscleGroup } from './enums';
import type { IsoDateString } from './common';

/** `YYYY-MM-DD` calendar dates (no time zone). */
export interface LimitationDto {
  id: string;
  clientId: string;
  target: LimitationTarget;
  /** Set when target = MUSCLE. */
  muscleGroup: MuscleGroup | null;
  /** Set when target = EXERCISE. */
  exerciseId: string | null;
  exerciseName: string | null;
  /** Set when target = JOINT. */
  joint: Joint | null;
  /** Set when target = PATTERN. */
  pattern: MovementPattern | null;
  severity: LimitationSeverity;
  note: string | null;
  startsOn: string;
  endsOn: string | null;
  createdAt: IsoDateString;
}

export interface CreateLimitationRequest {
  target: LimitationTarget;
  muscleGroup?: MuscleGroup;
  exerciseId?: string;
  joint?: Joint;
  pattern?: MovementPattern;
  severity: LimitationSeverity;
  note?: string | null;
  /** Defaults to today. */
  startsOn?: string;
  endsOn?: string | null;
}

export interface UpdateLimitationRequest {
  severity?: LimitationSeverity;
  note?: string | null;
  startsOn?: string;
  endsOn?: string | null;
}

/** Advisory marker on a prescription or swap option. Never blocks logging. */
export interface LimitationFlag {
  limitationId: string;
  severity: LimitationSeverity;
  note: string | null;
}

/** One prescribed exercise that an active limitation flags. */
export interface ProgramConflictDto {
  workoutId: string;
  weekNumber: number;
  dayNumber: number;
  workoutName: string;
  exerciseId: string;
  exerciseName: string;
  limitation: LimitationFlag;
}

/** Advisory warnings for one client against one program, using limitations active today. */
export interface ClientProgramConflictsDto {
  clientId: string;
  clientName: string;
  conflicts: ProgramConflictDto[];
}
