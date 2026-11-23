import type { MuscleGroup, RecommendationAction } from './enums';
import type { LimitationFlag } from './limitations';
import type { DecimalString, IsoDateString } from './common';

/** Where today's target for an exercise came from. */
export type TargetSource = 'COACH_OVERRIDE' | 'RECOMMENDATION' | 'PRESCRIPTION' | 'LAST_SESSION' | 'BASELINE' | 'NONE';

export interface TodayTarget {
  weightKg: DecimalString | null;
  repsMin: number | null;
  repsMax: number | null;
  rpe: DecimalString | null;
  source: TargetSource;
  /** Coach's note on a manual override. */
  note: string | null;
  overriddenBy: { id: string; name: string } | null;
  overriddenAt: IsoDateString | null;
}

export interface TodayExercise {
  workoutExerciseId: string;
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup;
  order: number;
  sets: number;
  restSeconds: number | null;
  notes: string | null;
  target: TodayTarget;
  /** Recommendation to open in the "why this call" sheet; null when there is none. */
  recommendationId: string | null;
  recommendationAction: RecommendationAction | null;
  /** Active limitation covering this exercise (advisory); null when none. */
  limitation: LimitationFlag | null;
}

export interface TodayWorkout {
  id: string;
  assignmentId: string;
  name: string;
  weekNumber: number;
  dayNumber: number;
  exercises: TodayExercise[];
}

/** A recommendation resolved in the last 3 days (drives the "target changed" banner). */
export interface TodayBanner {
  recommendationId: string;
  action: RecommendationAction;
  exerciseId: string;
  exerciseName: string;
  autoApproved: boolean;
  /** Coach who approved it; null when auto-approved. */
  approvedByName: string | null;
  resolvedAt: IsoDateString;
  /** Last top-set weight the call was based on. */
  fromWeightKg: number | null;
  /** The target now in force (coach override if any). */
  toWeightKg: DecimalString | null;
}

export type TodayState = 'NO_PROGRAM' | 'READY' | 'WEEK_COMPLETE';

export interface TodayDto {
  /** Display name, else first name. */
  greetingName: string;
  coachName: string | null;
  state: TodayState;
  /** e.g. `Upper/Lower Strength Block`; null without a program. */
  blockName: string | null;
  currentWeek: number | null;
  totalWeeks: number | null;
  weekProgress: { completed: number; total: number } | null;
  workout: TodayWorkout | null;
  banner: TodayBanner | null;
  /** Most recent logged session, for "Repeat last session". */
  lastSessionId: string | null;
}
