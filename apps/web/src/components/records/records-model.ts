import type { ExerciseRecordsDto, RecordCellDto, TrendPointDto, WeightUnit } from '@coaching/shared';
import { toNumber } from '@/lib/format';
import { kgToDisplay, unitLabel } from '@/lib/units';

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
