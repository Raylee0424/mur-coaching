import { WeightUnit } from '@coaching/shared';
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
