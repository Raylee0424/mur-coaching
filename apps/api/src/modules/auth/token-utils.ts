import { createHash, randomBytes, randomInt } from 'node:crypto';

export const VERIFY_CODE_TTL_MS = 15 * 60 * 1000;
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;

export const LOCKOUT_THRESHOLD = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

/** Tokens and codes are stored only as sha256 hex; the raw value lives in the email/URL. */
export const hashToken = (raw: string): string => createHash('sha256').update(raw).digest('hex');

/** 256 bits, URL-safe. */
export const generateToken = (): string => randomBytes(32).toString('base64url');

/** Zero-padded 6 digits from a CSPRNG. */
export const generateCode = (): string => randomInt(0, 1_000_000).toString().padStart(6, '0');

/** A 6-digit code is hashed together with its owner so equal codes of different users never collide. */
export const hashCode = (userId: string, code: string): string => hashToken(`${userId}:${code}`);

export const isExpired = (expiresAt: Date, now: Date = new Date()): boolean => expiresAt.getTime() <= now.getTime();

/** Usable = not yet used and not expired. */
export const isUsable = (t: { usedAt: Date | null; expiresAt: Date }, now: Date = new Date()): boolean =>
  t.usedAt === null && !isExpired(t.expiresAt, now);

export const isLocked = (lockedUntil: Date | null, now: Date = new Date()): boolean =>
  lockedUntil !== null && lockedUntil.getTime() > now.getTime();

export const lockMinutesLeft = (lockedUntil: Date, now: Date = new Date()): number =>
  Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 60_000));

export interface LockoutState {
  failedLoginCount: number;
  lockedUntil: Date | null;
}

/**
 * State after one more failed login. A lock that already expired starts a fresh count,
 * so one typo after a lockout does not re-lock the account.
 */
export function afterFailedLogin(state: LockoutState, now: Date = new Date()): LockoutState {
  const stale = state.lockedUntil !== null && !isLocked(state.lockedUntil, now);
  const count = (stale ? 0 : state.failedLoginCount) + 1;
  return count >= LOCKOUT_THRESHOLD
    ? { failedLoginCount: count, lockedUntil: new Date(now.getTime() + LOCKOUT_MS) }
    : { failedLoginCount: count, lockedUntil: null };
}

export const clearedLockout = (): LockoutState => ({ failedLoginCount: 0, lockedUntil: null });
