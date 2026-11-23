import { describe, expect, it } from 'vitest';
import {
  PLATES_KG,
  PLATES_LB,
  bmr,
  bodyFatNavy,
  dots,
  macros,
  oneRepMax,
  percentOf,
  plateLoader,
  tdee,
  waterIntakeLitres,
  weeklyNetStimulus,
  wilks,
} from '@coaching/shared';
import { describePlates, parseNum } from '@/components/calculators/calculators-model';

describe('oneRepMax', () => {
  it('matches Epley, Brzycki and Lombardi', () => {
    expect(oneRepMax(100, 5)).toBeCloseTo(116.667, 3);
    expect(oneRepMax(100, 5, 'BRZYCKI')).toBeCloseTo(112.5, 3);
    expect(oneRepMax(100, 5, 'LOMBARDI')).toBeCloseTo(117.46, 2);
  });
  it('returns the weight for a single and null outside the domain', () => {
    expect(oneRepMax(140, 1)).toBe(140);
    expect(oneRepMax(100, 13)).toBeNull();
    expect(oneRepMax(100, 2.5)).toBeNull();
    expect(oneRepMax(0, 5)).toBeNull();
    expect(oneRepMax(Number.NaN, 5)).toBeNull();
  });
  it('computes percentages', () => {
    expect(percentOf(200, 90)).toBe(180);
    expect(percentOf(200, 0)).toBeNull();
  });
});

describe('plateLoader', () => {
  it('loads 157.5 kg on a 20 kg bar as 2×25 + 15 + 2.5 + 1.25 per side', () => {
    const load = plateLoader(157.5, 20, PLATES_KG);
    expect(load?.perSide).toEqual([25, 25, 15, 2.5, 1.25]);
    expect(load?.loaded).toBe(157.5);
    expect(load?.shortfall).toBe(0);
  });
  it('reports what the plate set cannot make', () => {
    const load = plateLoader(61, 20, PLATES_KG);
    expect(load?.perSide).toEqual([20]);
    expect(load?.loaded).toBe(60);
    expect(load?.shortfall).toBe(1);
  });
  it('works in pounds and for bar-only', () => {
    expect(plateLoader(225, 45, PLATES_LB)?.perSide).toEqual([45, 45]);
    expect(plateLoader(45, 45, PLATES_LB)?.perSide).toEqual([]);
  });
  it('rejects a target under the bar and bad input', () => {
    expect(plateLoader(15, 20, PLATES_KG)).toBeNull();
    expect(plateLoader(100, 20, [])).toBeNull();
    expect(plateLoader(100, 0, PLATES_KG)).toBeNull();
  });
  it('describes plates compactly', () => {
    expect(describePlates([25, 25, 15, 2.5, 1.25])).toBe('2×25 + 15 + 2.5 + 1.25');
    expect(describePlates([])).toBe('Bar only');
  });
});

describe('energy and macros', () => {
  it('BMR (Mifflin–St Jeor): 80 kg, 180 cm, 30 y', () => {
    expect(bmr('MALE', 80, 180, 30)).toBe(1780);
    expect(bmr('FEMALE', 60, 165, 30)).toBeCloseTo(1320.25, 2);
    expect(bmr('MALE', 0, 180, 30)).toBeNull();
  });
  it('TDEE multiplies by the activity factor', () => {
    expect(tdee(1780, 'MODERATE')).toBeCloseTo(2759, 0);
    expect(tdee(-1, 'LIGHT')).toBeNull();
  });
  it('macros split calories at 4/4/9 and need 100%', () => {
    const m = macros(2500, { proteinPct: 30, carbsPct: 40, fatPct: 30 });
    expect(m?.proteinG).toBeCloseTo(187.5, 2);
    expect(m?.carbsG).toBeCloseTo(250, 2);
    expect(m?.fatG).toBeCloseTo(83.33, 2);
    expect(macros(2500, { proteinPct: 30, carbsPct: 40, fatPct: 40 })).toBeNull();
    expect(macros(0, { proteinPct: 30, carbsPct: 40, fatPct: 30 })).toBeNull();
  });
});

describe('strength scores', () => {
  it('DOTS: 83 kg man, 600 kg total ≈ 405.1 (by hand: 500 / 740.66 × 600)', () => {
    expect(dots('MALE', 83, 600)).toBeCloseTo(405.05, 1);
  });
  it('Wilks: 83 kg man, 600 kg total ≈ 400.5 (coefficient ≈ 0.667)', () => {
    expect(wilks('MALE', 83, 600)).toBeCloseTo(400.5, 0);
  });
  it('scores a heavier total higher and rejects out-of-range bodyweight', () => {
    expect(dots('FEMALE', 60, 400)!).toBeGreaterThan(dots('FEMALE', 60, 300)!);
    expect(dots('MALE', 30, 500)).toBeNull();
    expect(wilks('FEMALE', 200, 500)).toBeNull();
  });
});

describe('body fat, water, stimulus', () => {
  it('US Navy, male 180 cm / neck 38 / waist 85 ≈ 16.1 % (by hand: 495 / 1.06197 − 450)', () => {
    expect(bodyFatNavy({ sex: 'MALE', heightCm: 180, neckCm: 38, waistCm: 85 })).toBeCloseTo(16.1, 1);
  });
  it('needs hips for women and a waist larger than the neck for men', () => {
    expect(bodyFatNavy({ sex: 'FEMALE', heightCm: 165, neckCm: 32, waistCm: 74 })).toBeNull();
    expect(bodyFatNavy({ sex: 'FEMALE', heightCm: 165, neckCm: 32, waistCm: 74, hipCm: 98 })).toBeGreaterThan(15);
    expect(bodyFatNavy({ sex: 'MALE', heightCm: 180, neckCm: 40, waistCm: 38 })).toBeNull();
  });
  it('water: 35 ml/kg plus 12 ml per training minute', () => {
    expect(waterIntakeLitres(80, 60)).toBeCloseTo(3.52, 2);
    expect(waterIntakeLitres(80, -1)).toBeNull();
  });
  it('net stimulus weights sets by RIR and bands the total', () => {
    const sets = (n: number, rir: number) => Array.from({ length: n }, () => ({ rir }));
    expect(weeklyNetStimulus(sets(12, 2))).toEqual({ effectiveSets: 12, band: 'PRODUCTIVE' });
    expect(weeklyNetStimulus(sets(12, 5))).toEqual({ effectiveSets: 6, band: 'MAINTAIN' });
    expect(weeklyNetStimulus(sets(12, 7))).toEqual({ effectiveSets: 0, band: 'BELOW' });
    expect(weeklyNetStimulus(sets(22, 1)).band).toBe('HIGH');
    expect(weeklyNetStimulus([]).band).toBe('BELOW');
  });
});

describe('parseNum', () => {
  it('treats blank and junk as null, accepts a decimal comma', () => {
    expect(parseNum('')).toBeNull();
    expect(parseNum('abc')).toBeNull();
    expect(parseNum('82,5')).toBe(82.5);
  });
});
