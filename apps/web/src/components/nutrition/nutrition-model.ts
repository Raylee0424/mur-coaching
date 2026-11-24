import { DAILY_VALUES, MEAL_SLOTS, MICRO_KEYS, NUTRIENT_META, shareOf, sumNutrients } from '@coaching/shared';
import type { MealEntryDto, MealSlot, MicroKey, NutrientTotals, NutritionTargetDto, WaterLogDto } from '@coaching/shared';

/** Whole numbers with thousands separators; `digits` for small values like grams. */
export function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function dayTotals(entries: Pick<MealEntryDto, 'nutrients'>[]): NutrientTotals {
  return sumNutrients(entries.map((e) => e.nutrients));
}

export function waterTotal(water: Pick<WaterLogDto, 'ml'>[]): number {
  return water.reduce((s, w) => s + w.ml, 0);
}

export function litres(ml: number): string {
  return (ml / 1000).toFixed(1);
}

export type MacroTone = 'primary' | 'sky' | 'emerald' | 'amber';

export interface MacroBar {
  key: 'kcal' | 'proteinG' | 'carbsG' | 'fatG';
  label: string;
  unit: string;
  value: number;
  target: number | null;
  /** Whole percent of target, or null without one. */
  pct: number | null;
  tone: MacroTone;
}

const MACRO_TONES: Record<MacroBar['key'], MacroTone> = { kcal: 'primary', proteinG: 'sky', carbsG: 'emerald', fatG: 'amber' };

/** The four Daily Targets tiles, in Stitch order. */
export function macroBars(totals: NutrientTotals, target: NutritionTargetDto | null): MacroBar[] {
  return (['kcal', 'proteinG', 'carbsG', 'fatG'] as const).map((key) => {
    const t = target ? target[key] : null;
    return { key, label: NUTRIENT_META[key].label, unit: NUTRIENT_META[key].unit, value: totals[key], target: t, pct: shareOf(totals[key], t), tone: MACRO_TONES[key] };
  });
}

/** Bar fill width: 0–100 regardless of overshoot. */
export function barWidth(pct: number | null): number {
  return pct === null ? 0 : Math.max(0, Math.min(100, pct));
}

export type MicroTone = 'amber' | 'emerald' | 'primary' | 'muted';

export interface MicroRow {
  key: MicroKey;
  label: string;
  unit: string;
  value: number;
  /** The goal used: the fiber target when set, else the FDA Daily Value. */
  goal: number;
  pct: number;
  tone: MicroTone;
  /** Sodium is a ceiling: high is the warning. */
  ceiling: boolean;
}

/** Below 70% amber, 70–119% emerald, 120%+ lime. Sodium flips: above 100% is amber. */
export function microTone(pct: number, ceiling: boolean): MicroTone {
  if (ceiling) return pct > 100 ? 'amber' : 'emerald';
  if (pct < 70) return 'amber';
  return pct < 120 ? 'emerald' : 'primary';
}

export function microRows(totals: NutrientTotals, target: NutritionTargetDto | null): MicroRow[] {
  return MICRO_KEYS.map((key) => {
    const goal = key === 'fiberG' && target?.fiberG ? target.fiberG : DAILY_VALUES[key];
    const pct = shareOf(totals[key], goal) ?? 0;
    const ceiling = key === 'sodiumMg';
    return { key, label: NUTRIENT_META[key].label, unit: NUTRIENT_META[key].unit, value: totals[key], goal, pct, tone: microTone(pct, ceiling), ceiling };
  });
}

/** Entries grouped by meal slot in day order; empty slots omitted. */
export function groupBySlot<T extends Pick<MealEntryDto, 'slot'>>(entries: T[]): { slot: MealSlot; entries: T[] }[] {
  return MEAL_SLOTS.map((slot) => ({ slot, entries: entries.filter((e) => e.slot === slot) })).filter((g) => g.entries.length > 0);
}

/** Default meal slot from the hour of day. */
export function slotForHour(hour: number): MealSlot {
  if (hour < 11) return 'BREAKFAST';
  if (hour < 15) return 'LUNCH';
  if (hour < 21) return 'DINNER';
  return 'SNACK';
}

export function shiftDate(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** `NOV 23, 2026` (UTC, matches the server's calendar date). */
export function dayStamp(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).toUpperCase();
}

/** `Mon 23` for chart axes. */
export function shortDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Calories implied by macro grams (4/4/9). */
export function macroKcal(t: { proteinG: number; carbsG: number; fatG: number }): number {
  return t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9;
}

/** `42 / 68 / 8` protein / carbs / fat, whole grams. */
export function pcf(n: { proteinG: string | number; carbsG: string | number; fatG: string | number }): string {
  return [n.proteinG, n.carbsG, n.fatG].map((v) => fmt(Number(v))).join(' / ');
}
