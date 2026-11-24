import type { DecimalString, IsoDateString } from './common';

export type CalendarDayStatus = 'COMPLETED' | 'MISSED' | 'HIGH_RPE' | 'SCHEDULED' | 'TODAY' | 'SKIPPED';

export interface StatWithDelta {
  value: number | null;
  previous: number | null;
  /** value - previous; null if either side is missing. Adherence delta is in percentage points. */
  delta: number | null;
}

export interface CalendarTopSet {
  exerciseId: string;
  exerciseName: string;
  weightKg: DecimalString;
  reps: number;
  rpe: DecimalString | null;
}

export interface CalendarDay {
  /** `YYYY-MM-DD` (UTC). */
  date: string;
  /** Null on rest days. */
  workoutName: string | null;
  workoutId: string | null;
  /** Calendar row to move or skip; null on rest days and ad-hoc sessions. */
  scheduledWorkoutId: string | null;
  /** Null on rest days. */
  status: CalendarDayStatus | null;
  /** Logged session for this slot (or an ad-hoc session on this date). */
  workoutLogId: string | null;
  performedAt: IsoDateString | null;
  topSet: CalendarTopSet | null;
  notes: string | null;
}

export interface ClientOverviewDto {
  clientId: string;
  /** `YYYY-MM`. */
  month: string;
  /** Last 28 days vs the 28 days before. Percent. */
  adherence: StatWithDelta;
  /** Total working-set volume (kg) over the last 7 days vs the 7 days before. */
  weeklyVolumeKg: StatWithDelta;
  /** Average RPE over the last 7 days vs the 7 days before, plus the RPE cap in force for this client. */
  avgRpe: StatWithDelta & { cap: number };
  /** Consecutive scheduled sessions completed (ending at the most recent one) and the best such run. */
  streak: { current: number; best: number };
  days: CalendarDay[];
}
