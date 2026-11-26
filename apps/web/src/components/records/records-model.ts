import { WeightUnit } from '@coaching/shared';
import type { DecimalString, ExerciseRecordsDto, RecordCellDto, TrendPointDto } from '@coaching/shared';
import { toNumber } from '@/lib/format';
import { KG_PER_LB, kgToDisplay, unitLabel } from '@/lib/units';

const weightFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export const bracketLabel = (reps: number): string => `${reps}RM`;

/** "184 kg", or an em dash for a bracket never lifted. */
export function formatCell(cell: RecordCellDto | null, unit: WeightUnit): string {
  return cell ? `${weightFmt.format(kgToDisplay(toNumber(cell.weightKg), unit))} ${unitLabel(unit)}` : '—';
}

/** Screen-reader text for a matrix cell: names the set when it was heavier at more reps than the bracket. */
export function cellLabel(exerciseName: string, cell: RecordCellDto | null, reps: number, unit: WeightUnit): string {
  if (!cell) return `${exerciseName}, ${bracketLabel(reps)}: no record yet`;
  const via = cell.setReps > reps ? ` (set for ${cell.setReps} reps)` : '';
  return `${exerciseName}, ${bracketLabel(reps)}: ${formatCell(cell, unit)}${via}`;
}

export type DeltaTone = 'good' | 'bad' | 'neutral';

/** "+6.8%", "−1.2%" or an em dash. */
export function formatDeltaPct(pct: number | null): { text: string; tone: DeltaTone } {
  if (pct === null) return { text: '—', tone: 'neutral' };
  if (pct === 0) return { text: '0%', tone: 'neutral' };
  return { text: `${pct > 0 ? '+' : '−'}${Math.abs(pct)}%`, tone: pct > 0 ? 'good' : 'bad' };
}

/** "+11.5 kg" / "−3 lb", in the athlete's unit. */
export function formatDeltaWeight(kg: number | null, unit: WeightUnit): string {
  if (kg === null) return '—';
  const v = Math.round(kgToDisplay(Math.abs(kg), unit) * 10) / 10;
  return `${kg < 0 ? '−' : '+'}${weightFmt.format(v)} ${unitLabel(unit)}`;
}

/** The exercise the page shows: the requested one when it has records or stats, else the strongest lift. */
export function pickExerciseId(exercises: readonly ExerciseRecordsDto[], requested: string | undefined): string | null {
  if (requested && exercises.some((e) => e.exerciseId === requested)) return requested;
  return exercises[0]?.exerciseId ?? null;
}

export function trendSeries(trend: readonly TrendPointDto[], unit: WeightUnit): { label: string; value: number }[] {
  return trend.map((p) => ({
    label: new Date(p.performedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
    value: kgToDisplay(p.e1rmKg, unit),
  }));
}

/** "6 tracked lifts" / "1 tracked lift". */
export const trackedLiftsLabel = (n: number): string => `${n} tracked lift${n === 1 ? '' : 's'}`;

/** "150 kg × 5": the record set itself, in the athlete's unit. */
export function bestSetLabel(cell: RecordCellDto, unit: WeightUnit): string {
  return `${formatCell(cell, unit)} × ${cell.setReps}`;
}

/** Rounds to the nearest half step a gym can load: 0.5 kg or 1 lb. */
function toLoadable(value: number, unit: WeightUnit): number {
  const step = unit === WeightUnit.LB ? 1 : 0.5;
  return Math.round(value / step) * step;
}

/** "226.5 kg": an estimated 1RM in the athlete's unit, rounded to a loadable step (no false precision). */
export function formatE1rm(kg: DecimalString | number, unit: WeightUnit): string {
  // Convert from raw kg: kgToDisplay already rounds lb to 0.1, and rounding twice can push 220.46 to 221.
  const n = toNumber(kg);
  const display = unit === WeightUnit.LB ? n / KG_PER_LB : n;
  return `${weightFmt.format(toLoadable(display, unit))} ${unitLabel(unit)}`;
}

export type MatrixCell =
  /** A set logged at exactly this rep count. `isNew` when set inside the records window. */
  | { kind: 'logged'; text: string; isNew: boolean }
  /** Real weight from a set of more reps (170 kg × 10 also answers 9RM). Shown muted. */
  | { kind: 'covered'; text: string; setReps: number }
  /** Below the lowest rep count ever logged: Epley estimate from the lift's best e1RM. */
  | { kind: 'estimated'; text: string }
  | { kind: 'none'; text: '—' };

/** Fewest reps the lift was logged at exactly; null when no cell is an exact-rep set. */
export function lowestLoggedReps(cells: readonly (RecordCellDto | null)[]): number | null {
  const exact = cells.flatMap((c) => (c && c.setReps === c.reps ? [c.reps] : []));
  return exact.length ? Math.min(...exact) : null;
}

/**
 * One rep-max matrix cell. Repeating "170 kg" from a 10-rep set across 1RM–7RM tells the athlete nothing,
 * so counts below the lowest logged one become an estimate from the best e1RM (Epley, the engine default).
 * Counts between logged ones keep the real covering set, so the row never shows an estimate above a real lift.
 */
export function matrixCell(
  cell: RecordCellDto | null,
  reps: number,
  lowestLogged: number | null,
  bestE1rmKg: DecimalString,
  unit: WeightUnit,
  windowDays: number,
  now: Date,
): MatrixCell {
  if (!cell) return { kind: 'none', text: '—' };
  if (cell.setReps === reps) {
    const ageDays = (now.getTime() - new Date(cell.achievedAt).getTime()) / 86_400_000;
    return { kind: 'logged', text: formatCell(cell, unit), isNew: ageDays <= windowDays };
  }
  if (lowestLogged !== null && reps > lowestLogged) return { kind: 'covered', text: formatCell(cell, unit), setReps: cell.setReps };
  const estimateKg = toNumber(bestE1rmKg) / (1 + reps / 30);
  return { kind: 'estimated', text: `~${formatE1rm(estimateKg, unit)}` };
}

/** Sparkline values in the athlete's unit, oldest first. */
export const sparkValues = (trendE1rmKg: readonly string[], unit: WeightUnit): number[] =>
  trendE1rmKg.map((kg) => kgToDisplay(toNumber(kg), unit));
