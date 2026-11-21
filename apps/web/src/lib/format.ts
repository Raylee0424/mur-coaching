import type { DecimalString, IsoDateString, WeightUnit } from '@coaching/shared';
import { formatWeight } from './units';

/** The only place Decimal strings from the API become numbers. */
export function toNumber(value: DecimalString | number): number {
  return typeof value === 'number' ? value : Number(value);
}

const rpeFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

export function formatRpe(value: DecimalString | number | null): string {
  return value === null ? '' : `RPE ${rpeFmt.format(toNumber(value))}`;
}

/** UTC so a session never shifts a day depending on the server's timezone. */
export function formatDate(iso: IsoDateString): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** 1-based program week for an assignment, clamped to [1, durationWeeks]. */
export function programWeek(startDate: IsoDateString, durationWeeks: number, nowMs: number = Date.now()): number {
  const elapsed = Math.floor((nowMs - new Date(startDate).getTime()) / WEEK_MS) + 1;
  return Math.min(Math.max(elapsed, 1), durationWeeks);
}

interface TargetFields {
  recommendedSets: number | null;
  recommendedRepsMin: number | null;
  recommendedRepsMax: number | null;
  recommendedWeightKg: DecimalString | null;
}

/** "3 × 6–8 @ 102.5 kg"; omits parts the engine left null. */
export function formatTarget(rec: TargetFields, unit: WeightUnit): string {
  const { recommendedSets: sets, recommendedRepsMin: min, recommendedRepsMax: max, recommendedWeightKg: kg } = rec;
  const reps = min === null || max === null ? null : min === max ? String(min) : `${min}–${max}`;
  const parts: string[] = [];
  if (sets !== null && reps !== null) parts.push(`${sets} × ${reps}`);
  else if (reps !== null) parts.push(`${reps} reps`);
  else if (sets !== null) parts.push(`${sets} sets`);
  if (kg !== null) parts.push(`@ ${formatWeight(kg, unit)}`);
  return parts.join(' ');
}
