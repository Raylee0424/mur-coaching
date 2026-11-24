/**
 * Pure calculator formulas for the athlete Calculators Hub. No I/O, no rounding of results beyond what the
 * formula defines; callers format. Functions return `null` for inputs outside the formula's valid domain.
 * Weights and lengths are metric (kg, cm) unless a function says it is unit-agnostic.
 */

export type Sex = 'MALE' | 'FEMALE';

const positive = (...values: number[]): boolean => values.every((v) => Number.isFinite(v) && v > 0);

// ───────── 1RM ─────────

export type OneRepMaxFormula = 'EPLEY' | 'BRZYCKI' | 'LOMBARDI';

/** Unit-agnostic: result is in the unit of `weight`. Reps above 12 are too noisy to estimate from. */
export function oneRepMax(weight: number, reps: number, formula: OneRepMaxFormula = 'EPLEY'): number | null {
  if (!positive(weight, reps) || !Number.isInteger(reps) || reps > 12) return null;
  if (reps === 1) return weight;
  switch (formula) {
    case 'EPLEY':
      return weight * (1 + reps / 30);
    case 'BRZYCKI':
      return (weight * 36) / (37 - reps);
    case 'LOMBARDI':
      return weight * reps ** 0.1;
  }
}

/** Working weight at `percent` of a 1RM, same unit. */
export function percentOf(oneRm: number, percent: number): number | null {
  return positive(oneRm, percent) ? (oneRm * percent) / 100 : null;
}

// ───────── Plate loader ─────────

export interface PlateLoad {
  /** Plates for one side, heaviest first. */
  perSide: number[];
  /** Weight actually loaded, including the bar. */
  loaded: number;
  /** target − loaded (≥ 0); the part the plate set cannot make. */
  shortfall: number;
}

/** Unit-agnostic greedy loader. Returns null when the target is below the bar or inputs are invalid. */
export function plateLoader(target: number, bar: number, plates: readonly number[]): PlateLoad | null {
  if (!positive(target, bar) || target < bar || plates.length === 0 || !plates.every((p) => positive(p))) return null;
  const sorted = [...plates].sort((a, b) => b - a);
  // Work in thousandths so 1.25 + 2.5 never drifts.
  let side = Math.floor(((target - bar) / 2) * 1000 + 1e-6);
  const perSide: number[] = [];
  for (const plate of sorted) {
    const p = Math.round(plate * 1000);
    while (side >= p) {
      perSide.push(plate);
      side -= p;
    }
  }
  const loaded = bar + 2 * perSide.reduce((a, b) => a + b, 0);
  return { perSide, loaded: Math.round(loaded * 1000) / 1000, shortfall: Math.round((target - loaded) * 1000) / 1000 };
}

export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const;
export const PLATES_LB = [45, 35, 25, 10, 5, 2.5] as const;

// ───────── Energy ─────────

/** Mifflin–St Jeor, kcal/day. */
export function bmr(sex: Sex, weightKg: number, heightCm: number, ageYears: number): number | null {
  if (!positive(weightKg, heightCm, ageYears)) return null;
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + (sex === 'MALE' ? 5 : -161);
}

export type ActivityLevel = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'HIGH' | 'EXTREME';

export const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  HIGH: 1.725,
  EXTREME: 1.9,
};

export function tdee(bmrKcal: number, activity: ActivityLevel): number | null {
  return positive(bmrKcal) ? bmrKcal * ACTIVITY_MULTIPLIER[activity] : null;
}

export interface MacroSplit {
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}

export interface Macros {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** Percentages must sum to 100. Atwater factors: 4 / 4 / 9 kcal per gram. */
export function macros(calories: number, split: MacroSplit): Macros | null {
  const { proteinPct, carbsPct, fatPct } = split;
  if (!positive(calories) || [proteinPct, carbsPct, fatPct].some((v) => !Number.isFinite(v) || v < 0)) return null;
  if (Math.abs(proteinPct + carbsPct + fatPct - 100) > 0.01) return null;
  return {
    proteinG: (calories * proteinPct) / 100 / 4,
    carbsG: (calories * carbsPct) / 100 / 4,
    fatG: (calories * fatPct) / 100 / 9,
  };
}

// ───────── Strength standards ─────────

type Poly = readonly number[];

const horner = (coeffs: Poly, x: number): number => coeffs.reduceRight((acc, c) => acc * x + c, 0);

const WILKS: Record<Sex, Poly> = {
  MALE: [-216.0475144, 16.2606339, -0.002388645, -0.00113732, 7.01863e-6, -1.291e-8],
  FEMALE: [594.31747775582, -27.23842536447, 0.82112226871, -0.00930733913, 4.731582e-5, -9.054e-8],
};

const DOTS: Record<Sex, Poly> = {
  MALE: [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093],
  FEMALE: [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -0.0000010706],
};

/** Valid bodyweight range for the published coefficients (kg). */
const BW_RANGE: Record<Sex, readonly [number, number]> = { MALE: [40, 210], FEMALE: [40, 150] };

function coefficientScore(table: Record<Sex, Poly>, scale: number, sex: Sex, bodyweightKg: number, totalKg: number): number | null {
  const [lo, hi] = BW_RANGE[sex];
  if (!positive(bodyweightKg, totalKg) || bodyweightKg < lo || bodyweightKg > hi) return null;
  return (scale / horner(table[sex], bodyweightKg)) * totalKg;
}

export const wilks = (sex: Sex, bodyweightKg: number, totalKg: number): number | null =>
  coefficientScore(WILKS, 500, sex, bodyweightKg, totalKg);

export const dots = (sex: Sex, bodyweightKg: number, totalKg: number): number | null =>
  coefficientScore(DOTS, 500, sex, bodyweightKg, totalKg);

// ───────── Body composition & hydration ─────────

export interface NavyMeasurements {
  sex: Sex;
  heightCm: number;
  neckCm: number;
  waistCm: number;
  /** Required for FEMALE. */
  hipCm?: number;
}

/** US Navy circumference method, % body fat. */
export function bodyFatNavy(m: NavyMeasurements): number | null {
  const { sex, heightCm, neckCm, waistCm, hipCm } = m;
  if (!positive(heightCm, neckCm, waistCm)) return null;
  let pct: number;
  if (sex === 'MALE') {
    if (waistCm <= neckCm) return null;
    pct = 495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450;
  } else {
    if (hipCm === undefined || !positive(hipCm) || waistCm + hipCm <= neckCm) return null;
    pct = 495 / (1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.221 * Math.log10(heightCm)) - 450;
  }
  return Number.isFinite(pct) && pct > 0 && pct < 75 ? pct : null;
}

/** Daily water estimate in litres: 35 ml/kg plus 12 ml per training minute. A guide, not medical advice. */
export function waterIntakeLitres(weightKg: number, trainingMinutes: number): number | null {
  if (!positive(weightKg) || !Number.isFinite(trainingMinutes) || trainingMinutes < 0) return null;
  return (weightKg * 35 + trainingMinutes * 12) / 1000;
}

// ───────── Weekly net stimulus ─────────

export type StimulusBand = 'BELOW' | 'MAINTAIN' | 'PRODUCTIVE' | 'HIGH';

export interface NetStimulus {
  /** Hard sets counted after weighting by proximity to failure. */
  effectiveSets: number;
  band: StimulusBand;
}

/**
 * "Net stimulus" for one muscle in one week: hard sets weighted by closeness to failure.
 * A set at 0–4 RIR counts fully, 5 RIR counts half, 6+ RIR counts nothing. Bands on effective sets:
 * under 6 BELOW, 6–9 MAINTAIN, 10–20 PRODUCTIVE, over 20 HIGH (recovery-limited).
 */
export function setWeightForRir(rir: number): number {
  return rir <= 4 ? 1 : rir <= 5 ? 0.5 : 0;
}

/** Band for a week's effective sets on one muscle. */
export function stimulusBand(effectiveSets: number): StimulusBand {
  return effectiveSets < 6 ? 'BELOW' : effectiveSets < 10 ? 'MAINTAIN' : effectiveSets <= 20 ? 'PRODUCTIVE' : 'HIGH';
}

export function weeklyNetStimulus(sets: ReadonlyArray<{ rir: number }>): NetStimulus {
  const effectiveSets = sets.reduce((sum, s) => sum + setWeightForRir(s.rir), 0);
  return { effectiveSets, band: stimulusBand(effectiveSets) };
}
