import { describe, expect, it } from 'vitest';
import { formatDate, formatKg, formatRpe, toNumber } from './format';

describe('format', () => {
  it('converts decimal strings', () => {
    expect(toNumber('102.50')).toBe(102.5);
    expect(toNumber(5)).toBe(5);
  });
  it('formats weight, rpe and dates', () => {
    expect(formatKg('100.00')).toBe('100 kg');
    expect(formatKg('2.5')).toBe('2.5 kg');
    expect(formatRpe('8.0')).toBe('RPE 8');
    expect(formatRpe(null)).toBe('');
    expect(formatDate('2026-11-21T00:30:00.000Z')).toBe('Nov 21, 2026');
  });
});

import { formatTarget, programWeek } from './format';

describe('programWeek / formatTarget', () => {
  const start = '2026-11-02T00:00:00.000Z';
  const day = 24 * 60 * 60 * 1000;
  it('computes a clamped 1-based week', () => {
    const t0 = new Date(start).getTime();
    expect(programWeek(start, 4, t0 - day)).toBe(1);
    expect(programWeek(start, 4, t0 + 8 * day)).toBe(2);
    expect(programWeek(start, 4, t0 + 100 * day)).toBe(4);
  });
  it('formats targets and skips nulls', () => {
    expect(
      formatTarget({ recommendedSets: 3, recommendedRepsMin: 6, recommendedRepsMax: 8, recommendedWeightKg: '102.50' }),
    ).toBe('3 × 6–8 @ 102.5 kg');
    expect(
      formatTarget({ recommendedSets: null, recommendedRepsMin: 8, recommendedRepsMax: 8, recommendedWeightKg: null }),
    ).toBe('8 reps');
  });
});
