import { describe, expect, it } from 'vitest';
import { displayToKg, formatWeight, kgToDisplay } from './units';

describe('units', () => {
  it('formats kg unchanged', () => {
    expect(formatWeight('102.50', 'KG')).toBe('102.5 kg');
    expect(formatWeight(100, 'KG')).toBe('100 kg');
  });

  it('converts kg to lb for display', () => {
    expect(formatWeight(100, 'LB')).toBe('220.5 lb');
  });

  it('round-trips a typed lb value through kg storage', () => {
    const kg = displayToKg(225, 'LB');
    expect(kg).toBe(102.05);
    expect(kgToDisplay(kg, 'LB')).toBe(225);
  });

  it('maps a displayed lb value back to the stored kg exactly', () => {
    for (const stored of [170, 102.5, 60, 142.5, 20]) {
      expect(displayToKg(kgToDisplay(stored, 'LB'), 'LB')).toBe(stored);
    }
  });

  it('keeps kg input at 2 decimals', () => {
    expect(displayToKg(102.555, 'KG')).toBe(102.56);
  });
});
