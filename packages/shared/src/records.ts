import type { DecimalString, IsoDateString } from './common';

/** Rep counts shown in the PR matrix. A bracket holds the heaviest working set of at least that many reps. */
export const PR_BRACKETS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/** Window for "sets", "avg RPE" and "net delta" on the stats table, and for "new PRs". */
export const RECORDS_WINDOW_DAYS = 30;

export interface RecordCellDto {
  /** Rep bracket this cell answers (one of `PR_BRACKETS`). */
  reps: number;
  weightKg: DecimalString;
  /** Reps of the set that holds the record; equals `reps` or more. */
  setReps: number;
  e1rmKg: DecimalString;
  achievedAt: IsoDateString;
}

export interface ExerciseStatsSummary {
  /** Working sets in the last `RECORDS_WINDOW_DAYS` days. */
  sets: number;
  avgRpe: number | null;
  /** Session e1RM change over the window, in percent. Null with fewer than two sessions in it. */
  netDeltaPct: number | null;
}

export interface ExerciseRecordsDto {
  exerciseId: string;
  exerciseName: string;
  /** One entry per `PR_BRACKETS` bracket; null when never lifted at that bracket. */
  cells: (RecordCellDto | null)[];
  /** Best estimated 1RM across the exercise's records. */
  bestE1rmKg: DecimalString;
  /** The record that holds `bestE1rmKg`; its `reps` and `setReps` are the set's own reps. */
  best: RecordCellDto;
  /** Session e1RM inside the window, oldest first (sparkline). Empty when the lift was not trained in it. */
  trendE1rmKg: DecimalString[];
  stats: ExerciseStatsSummary;
}

export interface RecordsDto {
  brackets: number[];
  windowDays: number;
  /** Records set inside the window, counted per exercise and rep count. */
  newRecords: number;
  exercises: ExerciseRecordsDto[];
}

export interface TrendPointDto {
  logId: string;
  performedAt: IsoDateString;
  e1rmKg: number;
  topWeightKg: number;
  topSetReps: number;
}

export interface ExerciseStatsDto {
  exercise: { id: string; name: string };
  /** Oldest first, last 12 sessions with working sets. */
  trend: TrendPointDto[];
  /** First to last e1RM of `trend`. Null with fewer than two sessions. */
  netDeltaKg: number | null;
  netDeltaPct: number | null;
  sessions: number;
  summary: ExerciseStatsSummary;
  records: (RecordCellDto | null)[];
}
