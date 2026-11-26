import type { MuscleGroup, WeightUnit, WorkoutLogDto } from '@coaching/shared';
import { toNumber } from '@/lib/format';
import { kgToDisplay, unitLabel } from '@/lib/units';

const DAY_MS = 86_400_000;

const isWorking = (s: { isWarmup: boolean }) => !s.isWarmup;

/** Working sets only: warm-ups never count toward set totals or volume. */
export function workingSetCount(log: WorkoutLogDto): number {
  return log.exerciseLogs.reduce((n, el) => n + el.sets.filter(isWorking).length, 0);
}

/** Σ weight × reps over working sets, in kg. */
export function sessionVolumeKg(log: WorkoutLogDto): number {
  let kg = 0;
  for (const el of log.exerciseLogs) for (const s of el.sets) if (isWorking(s)) kg += toNumber(s.weightKg) * s.reps;
  return Math.round(kg * 100) / 100;
}

const volumeFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** "12,450": volume in the athlete's unit, whole numbers (decimals are noise at this scale). */
export const volumeNumber = (kg: number, unit: WeightUnit): string => volumeFmt.format(Math.round(kgToDisplay(kg, unit)));

/** "12,450 kg". */
export const formatVolume = (kg: number, unit: WeightUnit): string => `${volumeNumber(kg, unit)} ${unitLabel(unit)}`;

/** Monday (UTC) of the week holding `iso`, as `YYYY-MM-DD`. UTC like every other session date. */
export function weekStart(iso: string): string {
  const d = new Date(iso);
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const sinceMonday = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - sinceMonday * DAY_MS).toISOString().slice(0, 10);
}

/** "WEEK OF NOV 16, 2026". */
export function weekLabel(monday: string): string {
  const text = new Date(`${monday}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return `Week of ${text}`.toUpperCase();
}

export interface WeekGroup {
  weekStart: string;
  label: string;
  logs: WorkoutLogDto[];
  volumeKg: number;
}

/** Groups newest-first logs by UTC week, keeping order (newest week first, newest session first). */
export function groupByWeek(logs: readonly WorkoutLogDto[]): WeekGroup[] {
  const groups: WeekGroup[] = [];
  for (const log of logs) {
    const start = weekStart(log.performedAt);
    let g = groups.find((x) => x.weekStart === start);
    if (!g) {
      g = { weekStart: start, label: weekLabel(start), logs: [], volumeKg: 0 };
      groups.push(g);
    }
    g.logs.push(log);
    g.volumeKg = Math.round((g.volumeKg + sessionVolumeKg(log)) * 100) / 100;
  }
  return groups;
}

const UPPER: ReadonlySet<MuscleGroup> = new Set(['CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS']);
const LOWER: ReadonlySet<MuscleGroup> = new Set(['QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES']);

export type SessionSplit = 'UPPER' | 'LOWER';

/**
 * Upper or lower by the primary muscle of most working sets (at least two thirds of the sets that are
 * either). Core and full-body sets do not vote. Mixed sessions are neither.
 */
export function sessionSplit(log: WorkoutLogDto): SessionSplit | null {
  let upper = 0;
  let lower = 0;
  for (const el of log.exerciseLogs) {
    const n = el.sets.filter(isWorking).length;
    if (UPPER.has(el.exercise.muscleGroup)) upper += n;
    else if (LOWER.has(el.exercise.muscleGroup)) lower += n;
  }
  const total = upper + lower;
  if (total === 0) return null;
  if (upper * 3 >= total * 2) return 'UPPER';
  if (lower * 3 >= total * 2) return 'LOWER';
  return null;
}

/** True when a set in the session still holds a personal record. */
export const isPrSession = (log: WorkoutLogDto): boolean => log.exerciseLogs.some((el) => el.sets.some((s) => s.personalRecord !== null));

export const recordCount = (logs: readonly WorkoutLogDto[]): number =>
  logs.reduce((n, l) => n + l.exerciseLogs.reduce((m, el) => m + el.sets.filter((s) => s.personalRecord !== null).length, 0), 0);

export type HistoryFilter = 'all' | 'upper' | 'lower' | 'pr';

export const FILTER_LABELS: Record<HistoryFilter, string> = { all: 'All workouts', upper: 'Upper', lower: 'Lower', pr: 'PR sessions' };

export function parseFilter(raw: string | undefined): HistoryFilter {
  return raw === 'upper' || raw === 'lower' || raw === 'pr' ? raw : 'all';
}

export function matchesFilter(log: WorkoutLogDto, filter: HistoryFilter): boolean {
  if (filter === 'upper') return sessionSplit(log) === 'UPPER';
  if (filter === 'lower') return sessionSplit(log) === 'LOWER';
  if (filter === 'pr') return isPrSession(log);
  return true;
}

/** Filters that match at least one loaded session, plus `all`. Pills the data cannot back are not shown. */
export function availableFilters(logs: readonly WorkoutLogDto[]): HistoryFilter[] {
  return (['all', 'upper', 'lower', 'pr'] as const).filter((f) => f === 'all' || logs.some((l) => matchesFilter(l, f)));
}

/** Program day name, else the lifts in order. */
export function sessionTitle(log: WorkoutLogDto): string {
  return log.workout?.name ?? (log.exerciseLogs.map((e) => e.exercise.name).join(' · ') || 'Session');
}

function topWorkingKg(log: WorkoutLogDto, exerciseId: string): number | null {
  let top: number | null = null;
  for (const el of log.exerciseLogs) {
    if (el.exerciseId !== exerciseId) continue;
    for (const s of el.sets) if (isWorking(s)) top = Math.max(top ?? 0, toNumber(s.weightKg));
  }
  return top;
}

/**
 * Top working weight for `exerciseId` in `log` minus the same lift's top in the previous loaded session
 * that trained it. Null when no earlier session is loaded or the lift has no working sets.
 */
export function lastTimeDeltaKg(log: WorkoutLogDto, exerciseId: string, newestFirst: readonly WorkoutLogDto[]): number | null {
  const now = topWorkingKg(log, exerciseId);
  if (now === null) return null;
  const at = newestFirst.findIndex((l) => l.id === log.id);
  if (at < 0) return null;
  for (const older of newestFirst.slice(at + 1)) {
    const before = topWorkingKg(older, exerciseId);
    if (before !== null) return Math.round((now - before) * 100) / 100;
  }
  return null;
}

/** The session the detail pane shows: the requested one if it is in the list, else the newest. */
export function pickLog(logs: readonly WorkoutLogDto[], requested: string | undefined): WorkoutLogDto | null {
  return (requested ? logs.find((l) => l.id === requested) : undefined) ?? logs[0] ?? null;
}
