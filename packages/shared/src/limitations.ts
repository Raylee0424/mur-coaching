import type { LimitationSeverity, LimitationTarget, MuscleGroup } from './enums';
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
