import { describe, expect, it } from 'vitest';
import { parseTrustProxy } from './env';

describe('parseTrustProxy', () => {
  it('turns true/false into booleans so Express never sees the string "true"', () => {
    expect(parseTrustProxy('true')).toBe(true);
    expect(parseTrustProxy('FALSE')).toBe(false);
    expect(parseTrustProxy(' true ')).toBe(true);
  });

  it('turns digits into a hop count', () => {
    expect(parseTrustProxy('2')).toBe(2);
  });

  it('keeps presets and subnet lists, normalizing spaces', () => {
    expect(parseTrustProxy('loopback')).toBe('loopback');
    expect(parseTrustProxy('loopback, 10.0.0.0/8 ,uniquelocal')).toBe('loopback,10.0.0.0/8,uniquelocal');
  });
});
