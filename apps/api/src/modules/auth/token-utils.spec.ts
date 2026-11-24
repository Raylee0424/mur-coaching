import { describe, expect, it } from 'vitest';
import {
  LOCKOUT_MS,
  LOCKOUT_THRESHOLD,
  afterFailedLogin,
  resendWaitSeconds,
  clearedLockout,
  generateCode,
  generateToken,
  hashCode,
  hashToken,
  isExpired,
  isLocked,
  isUsable,
  lockMinutesLeft,
} from './token-utils';

const NOW = new Date('2026-01-01T12:00:00Z');
const at = (ms: number): Date => new Date(NOW.getTime() + ms);

describe('token hashing', () => {
  it('is deterministic sha256 hex and never the raw value', () => {
    const raw = generateToken();
    expect(hashToken(raw)).toBe(hashToken(raw));
    expect(hashToken(raw)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(raw)).not.toContain(raw);
    expect(hashToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('generates unique url-safe tokens and 6-digit codes', () => {
    expect(generateToken()).not.toBe(generateToken());
    expect(generateToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
    for (let i = 0; i < 50; i++) expect(generateCode()).toMatch(/^\d{6}$/);
  });

  it('binds a code to its user', () => {
    expect(hashCode('u1', '123456')).not.toBe(hashCode('u2', '123456'));
    expect(hashCode('u1', '123456')).toBe(hashCode('u1', '123456'));
  });
});

describe('expiry', () => {
  it('expires exactly at expiresAt', () => {
    expect(isExpired(at(1000), NOW)).toBe(false);
    expect(isExpired(at(0), NOW)).toBe(true);
    expect(isExpired(at(-1), NOW)).toBe(true);
  });

  it('a used or expired token is unusable', () => {
    expect(isUsable({ usedAt: null, expiresAt: at(1000) }, NOW)).toBe(true);
    expect(isUsable({ usedAt: NOW, expiresAt: at(1000) }, NOW)).toBe(false);
    expect(isUsable({ usedAt: null, expiresAt: at(-1) }, NOW)).toBe(false);
  });
});

describe('lockout', () => {
  it('locks on the 5th consecutive failure for 15 minutes', () => {
    let state = clearedLockout();
    for (let i = 1; i < LOCKOUT_THRESHOLD; i++) {
      state = afterFailedLogin(state, NOW);
      expect(state).toEqual({ failedLoginCount: i, lockedUntil: null });
    }
    state = afterFailedLogin(state, NOW);
    expect(state.failedLoginCount).toBe(LOCKOUT_THRESHOLD);
    expect(state.lockedUntil).toEqual(at(LOCKOUT_MS));
    expect(isLocked(state.lockedUntil, NOW)).toBe(true);
    expect(isLocked(state.lockedUntil, at(LOCKOUT_MS))).toBe(false);
  });

  it('reports remaining minutes rounded up, at least 1', () => {
    expect(lockMinutesLeft(at(LOCKOUT_MS), NOW)).toBe(15);
    expect(lockMinutesLeft(at(61_000), NOW)).toBe(2);
    expect(lockMinutesLeft(at(1), NOW)).toBe(1);
  });

  it('a failure after an expired lock starts a fresh count', () => {
    const expired = { failedLoginCount: LOCKOUT_THRESHOLD, lockedUntil: at(-1000) };
    expect(afterFailedLogin(expired, NOW)).toEqual({ failedLoginCount: 1, lockedUntil: null });
  });

  it('success clears the counter', () => {
    expect(clearedLockout()).toEqual({ failedLoginCount: 0, lockedUntil: null });
  });
});

describe('resendWaitSeconds', () => {
  const now = new Date('2026-11-24T12:00:00Z');
  const ago = (s: number) => new Date(now.getTime() - s * 1000);

  it('allows the first send', () => {
    expect(resendWaitSeconds([], now)).toBe(0);
  });

  it('enforces a one-minute cooldown after the last send', () => {
    expect(resendWaitSeconds([ago(20)], now)).toBe(40);
    expect(resendWaitSeconds([ago(61)], now)).toBe(0);
  });

  it('caps sends at five per hour', () => {
    const five = [ago(3000), ago(2400), ago(1800), ago(1200), ago(600)];
    expect(resendWaitSeconds(five, now)).toBe(600);
    expect(resendWaitSeconds(five.slice(1), now)).toBe(0);
  });
});
