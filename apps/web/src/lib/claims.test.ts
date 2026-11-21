import { describe, expect, it } from 'vitest';
import { decodeClaims } from './claims';

function token(payload: unknown): string {
  const enc = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
  return `${enc({ alg: 'HS256' })}.${enc(payload)}.sig`;
}

const NOW = 1_700_000_000_000;
const FUTURE = NOW / 1000 + 3600;

describe('decodeClaims', () => {
  it('reads a valid token', () => {
    expect(decodeClaims(token({ sub: 'u1', role: 'COACH', exp: FUTURE }), NOW)).toEqual({
      sub: 'u1',
      role: 'COACH',
      exp: FUTURE,
    });
  });

  it('rejects missing, malformed and non-JSON tokens', () => {
    expect(decodeClaims(undefined, NOW)).toBeNull();
    expect(decodeClaims('', NOW)).toBeNull();
    expect(decodeClaims('garbage', NOW)).toBeNull();
    expect(decodeClaims('a.!!!.c', NOW)).toBeNull();
  });

  it('rejects expired tokens', () => {
    expect(decodeClaims(token({ sub: 'u1', role: 'CLIENT', exp: NOW / 1000 - 1 }), NOW)).toBeNull();
  });

  it('rejects unknown roles and bad shapes', () => {
    expect(decodeClaims(token({ sub: 'u1', role: 'ADMIN', exp: FUTURE }), NOW)).toBeNull();
    expect(decodeClaims(token({ sub: 1, role: 'COACH', exp: FUTURE }), NOW)).toBeNull();
    expect(decodeClaims(token({ sub: 'u1', role: 'COACH' }), NOW)).toBeNull();
    expect(decodeClaims(token(null), NOW)).toBeNull();
  });
});
