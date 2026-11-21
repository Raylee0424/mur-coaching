import { WeightUnit } from '@coaching/shared';
import type { DecimalString } from '@coaching/shared';

/** Storage is always kg; lb exists only at the display/input edge. */
export const KG_PER_LB = 0.45359237;

export const unitLabel = (unit: WeightUnit): string => (unit === WeightUnit.LB ? 'lb' : 'kg');

/** Smallest practical plate jump in the display unit. */
export const unitStep = (unit: WeightUnit): number => (unit === WeightUnit.LB ? 5 : 2.5);

const round = (value: number, decimals: number): number => {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
};

/** kg → display unit, rounded to 0.1 so lb values round-trip cleanly (225 lb stays 225). */
export function kgToDisplay(kg: number, unit: WeightUnit): number {
  return unit === WeightUnit.LB ? round(kg / KG_PER_LB, 1) : round(kg, 2);
}

/**
 * Display unit → kg for the API. lb snaps to 0.05 kg so a weight shown in lb and logged again maps back to
 * the same kg value (374.8 lb → 170 kg, not 170.01); the engine compares session weights exactly.
 */
export function displayToKg(value: number, unit: WeightUnit): number {
  return unit === WeightUnit.LB ? round(Math.round((value * KG_PER_LB) / 0.05) * 0.05, 2) : round(value, 2);
}

const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/** "102.5 kg" / "225 lb". Accepts API Decimal strings or numbers (always kg). */
export function formatWeight(kg: DecimalString | number, unit: WeightUnit): string {
  return `${fmt.format(kgToDisplay(Number(kg), unit))} ${unitLabel(unit)}`;
}
