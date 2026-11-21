import { Role } from '@coaching/shared';

/** Edge-safe: no Node or Next imports. Used by middleware and server code. */
export const SESSION_COOKIE = 'rc_session';

export interface Claims {
  sub: string;
  role: Role;
  /** Seconds since epoch. */
  exp: number;
}

function isRole(value: unknown): value is Role {
  return value === Role.COACH || value === Role.CLIENT;
}

/**
 * Reads the JWT payload for UX routing only. The signature is NOT verified here:
 * the API verifies it on every call and `/auth/me` is the authority.
 * Returns null for missing, malformed or expired tokens.
 */
export function decodeClaims(token: string | undefined, nowMs: number = Date.now()): Claims | null {
  if (!token) return null;
  const payload = token.split('.')[1];
  if (!payload) return null;

  let parsed: unknown;
  try {
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    parsed = JSON.parse(atob(padded));
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;

  const { sub, role, exp } = parsed as Record<string, unknown>;
  if (typeof sub !== 'string' || !isRole(role) || typeof exp !== 'number') return null;
  if (exp * 1000 <= nowMs) return null;
  return { sub, role, exp };
}
