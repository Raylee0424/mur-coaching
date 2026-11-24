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

/** Resend throttle for emailed codes and reset links: one per minute, five per hour, per account. */
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const RESEND_WINDOW_MS = 60 * 60 * 1000;
export const RESEND_MAX_PER_WINDOW = 5;

/**
 * Seconds until another email may be sent, or 0 when sending is allowed now.
 * `issuedAt` = creation times of this account's tokens of one type inside the last RESEND_WINDOW_MS.
 */
export function resendWaitSeconds(issuedAt: readonly Date[], now: Date = new Date()): number {
  const recent = issuedAt.map((d) => d.getTime()).filter((t) => now.getTime() - t < RESEND_WINDOW_MS).sort((a, b) => a - b);
  if (recent.length === 0) return 0;
  const latest = recent[recent.length - 1] as number;
  const cooldownEnds = latest + RESEND_COOLDOWN_MS;
  const windowEnds = recent.length >= RESEND_MAX_PER_WINDOW ? (recent[recent.length - RESEND_MAX_PER_WINDOW] as number) + RESEND_WINDOW_MS : 0;
  const waitMs = Math.max(cooldownEnds, windowEnds) - now.getTime();
  return waitMs > 0 ? Math.ceil(waitMs / 1000) : 0;
}
