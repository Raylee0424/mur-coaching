import { PR_BRACKETS, RECORDS_WINDOW_DAYS, type ExerciseStatsSummary, type TrendPointDto } from '@coaching/shared';
import { estimateOneRepMax } from '../progression/engine/metrics';

/** Pure personal-record and net-progression math. No I/O: the service loads sets and persists the result. */

const DAY_MS = 24 * 60 * 60 * 1000;

const round = (n: number, dp: number): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

export interface RecordSetInput {
  setLogId: string;
  reps: number;
  weightKg: number;
  rpe: number | null;
  isWarmup: boolean;
  performedAt: Date;
}

export interface RecordRow {
  setLogId: string;
  reps: number;
  weightKg: number;
  e1rmKg: number;
  achievedAt: Date;
}

/** Warm-ups, empty sets and zero-load sets never count. */
const counts = (s: RecordSetInput): boolean => !s.isWarmup && s.reps > 0 && s.weightKg > 0;

/**
 * The heaviest working set at each exact rep count. Equal weights: the earliest session keeps the record,
 * then the lower set id, so a rebuild always lands on the same row.
 */
export function computeRecords(sets: readonly RecordSetInput[]): RecordRow[] {
  const best = new Map<number, RecordSetInput>();
  for (const s of sets.filter(counts)) {
    const cur = best.get(s.reps);
    if (!cur || beats(s, cur)) best.set(s.reps, s);
  }
  return [...best.values()]
    .sort((a, b) => a.reps - b.reps)
    .map((s) => ({
      setLogId: s.setLogId,
      reps: s.reps,
      weightKg: s.weightKg,
      e1rmKg: round(estimateOneRepMax(s.weightKg, s.reps), 2),
      achievedAt: s.performedAt,
    }));
}

function beats(a: RecordSetInput, b: RecordSetInput): boolean {
  if (a.weightKg !== b.weightKg) return a.weightKg > b.weightKg;
  const dt = a.performedAt.getTime() - b.performedAt.getTime();
  return dt !== 0 ? dt < 0 : a.setLogId < b.setLogId;
}

export interface BracketCell {
  reps: number;
  record: RecordRow;
}

/** For each bracket, the heaviest record set with at least that many reps. Null where none exists. */
export function bracketCells(rows: readonly RecordRow[], brackets: readonly number[] = PR_BRACKETS): (BracketCell | null)[] {
  return brackets.map((reps) => {
    const eligible = rows.filter((r) => r.reps >= reps);
    if (eligible.length === 0) return null;
    const record = eligible.reduce((a, b) => (b.weightKg > a.weightKg || (b.weightKg === a.weightKg && b.reps < a.reps) ? b : a));
    return { reps, record };
  });
}

/** Records set inside the window, counted once per exercise and rep count. */
export function countRecent(rows: readonly RecordRow[], now: Date, windowDays = RECORDS_WINDOW_DAYS): number {
  const cutoff = now.getTime() - windowDays * DAY_MS;
  return rows.filter((r) => r.achievedAt.getTime() >= cutoff).length;
}

export interface NetDelta {
  kg: number;
  pct: number;
}

/** First to last e1RM. Null with fewer than two points or a non-positive start. */
export function netDelta(points: readonly Pick<TrendPointDto, 'e1rmKg'>[]): NetDelta | null {
  const first = points[0];
  const last = points[points.length - 1];
  if (points.length < 2 || !first || !last || first.e1rmKg <= 0) return null;
  return { kg: round(last.e1rmKg - first.e1rmKg, 1), pct: round(((last.e1rmKg - first.e1rmKg) / first.e1rmKg) * 100, 1) };
}

export interface SessionPoint extends TrendPointDto {
  workingSets: number;
  avgRpe: number | null;
}

/** Working-set count, mean RPE and net e1RM change over the window ending at `now`. Sessions oldest first. */
export function windowSummary(sessions: readonly SessionPoint[], now: Date, windowDays = RECORDS_WINDOW_DAYS): ExerciseStatsSummary {
  const cutoff = now.getTime() - windowDays * DAY_MS;
  const inWindow = sessions.filter((s) => new Date(s.performedAt).getTime() >= cutoff);
  const rpes = inWindow.flatMap((s) => (s.avgRpe === null ? [] : [s.avgRpe]));
  return {
    sets: inWindow.reduce((sum, s) => sum + s.workingSets, 0),
    avgRpe: rpes.length === 0 ? null : round(rpes.reduce((a, b) => a + b, 0) / rpes.length, 1),
    netDeltaPct: netDelta(inWindow)?.pct ?? null,
  };
}
