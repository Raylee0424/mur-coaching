import { isValidPassword } from '@coaching/shared';

export interface PasswordChecks {
  length: boolean;
  number: boolean;
}

export function passwordChecks(password: string): PasswordChecks {
  return { length: password.length >= 8, number: /\d/.test(password) };
}

/** 0-4 strength for the meter: non-empty, 8+ chars, a digit, an uppercase letter. */
export function passwordScore(password: string): number {
  const c = passwordChecks(password);
  return (password.length > 0 ? 1 : 0) + (c.length ? 1 : 0) + (c.number ? 1 : 0) + (/[A-Z]/.test(password) ? 1 : 0);
}

/** A password the API will accept, and whose confirmation matches. */
export function passwordProblem(password: string, confirm?: string): string | null {
  if (!isValidPassword(password)) return 'Password must be at least 8 characters and contain a number';
  if (confirm !== undefined && confirm !== password) return 'Passwords do not match.';
  return null;
}

export const CODE_LENGTH = 6;

/** Keeps digits only and caps the length (typing or pasting "482 910" gives "482910"). */
export function normalizeCode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, CODE_LENGTH);
}

/** Replaces the digit at `index` (or spreads a pasted run from there). Returns the new code string. */
export function setCodeDigits(code: string, index: number, raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const head = code.slice(0, index).padEnd(index, ' ');
  return normalizeCode((head + digits + code.slice(index + Math.max(digits.length, 1))).replace(/ /g, ''));
}

export function isCompleteCode(code: string): boolean {
  return code.length === CODE_LENGTH && /^\d+$/.test(code);
}

export type LoginState = { ok: false; error: string; locked?: boolean } | null;
