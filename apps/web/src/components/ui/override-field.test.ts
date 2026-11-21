import { describe, expect, it } from 'vitest';
import { parseOverride } from './OverrideField';

describe('parseOverride', () => {
  const L = { min: 5, max: 10, step: 0.5 };
  it('treats empty as inherit', () => expect(parseOverride('  ', L)).toEqual({ ok: true, value: null }));
  it('accepts in-range values on the step', () => expect(parseOverride('8.5', L)).toEqual({ ok: true, value: 8.5 }));
  it('rejects out of range and off-step', () => {
    expect(parseOverride('11', L).ok).toBe(false);
    expect(parseOverride('8.3', L)).toEqual({ ok: false, error: 'Use steps of 0.5.' });
    expect(parseOverride('abc', L).ok).toBe(false);
  });
});
