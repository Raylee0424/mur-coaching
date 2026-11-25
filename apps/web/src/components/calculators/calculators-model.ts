import { PLATES_KG, PLATES_LB, WeightUnit } from '@coaching/shared';
import { KG_PER_LB } from '@/lib/units';

/** Parses a form field. Blank or non-numeric input is `null`, never 0. */
export function parseNum(raw: string): number | null {
  const t = raw.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Display-unit weight → kg for formulas that need metric input. */
export function toKg(value: number, unit: WeightUnit): number {
  return unit === WeightUnit.LB ? value * KG_PER_LB : value;
}

export function fmt(value: number, decimals = 0): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** "2×25 + 15 + 2.5" for one side of the bar. */
export function describePlates(perSide: readonly number[]): string {
  if (perSide.length === 0) return 'Bar only';
  const counts = new Map<number, number>();
  for (const p of perSide) counts.set(p, (counts.get(p) ?? 0) + 1);
  return [...counts].map(([plate, n]) => (n > 1 ? `${n}×${plate}` : String(plate))).join(' + ');
}

export const DEFAULT_BAR = { KG: 20, LB: 45 } as const;

/** Browser-local "plates in my gym" set, one list per unit. Shared by the calculator and the logger. */
export const PLATE_SET_STORAGE_KEY = 'mur:plate-set';

export function allPlates(unit: WeightUnit): readonly number[] {
  return unit === WeightUnit.LB ? PLATES_LB : PLATES_KG;
}

/**
 * Reads the stored plate set for `unit`. Keeps only known plates for that unit, heaviest first.
 * Missing, malformed or empty data falls back to every plate.
 */
export function parsePlateSet(raw: string | null, unit: WeightUnit): readonly number[] {
  const all = allPlates(unit);
  if (!raw) return all;
  try {
    const parsed: unknown = JSON.parse(raw);
    const list = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>)[unit] : undefined;
    if (!Array.isArray(list)) return all;
    const kept = all.filter((p) => list.includes(p));
    return kept.length > 0 ? kept : all;
  } catch {
    return all;
  }
}

/** Writes `plates` for `unit`, leaving the other unit's set untouched. */
export function serializePlateSet(raw: string | null, unit: WeightUnit, plates: readonly number[]): string {
  let base: Record<string, unknown> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) base = parsed as Record<string, unknown>;
  } catch {
    // Overwrite malformed data.
  }
  return JSON.stringify({ ...base, [unit]: [...plates] });
}
