'use server';

import { redirect, unstable_rethrow } from 'next/navigation';
import { Role } from '@coaching/shared';
import type { AuthTokenResponse } from '@coaching/shared';
import { ApiError } from '@/lib/api/client';
import { authApi } from '@/lib/api/endpoints';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { decodeClaims } from '@/lib/claims';
import { formString as field } from '@/lib/form';
import { homeFor, safeNext } from '@/lib/routes';
import { clearSession, setSession } from '@/lib/session';

/** Runs the sign-in request, stores the session cookie and redirects. Only returns on failure. */
async function signIn(
  request: () => Promise<AuthTokenResponse>,
  rejected: string,
  next?: string | null,
): Promise<ActionResult> {
  let token: string;
  try {
    token = (await request()).accessToken;
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
      return { ok: false, error: rejected };
    }
    return toActionError(err);
  }

  const claims = decodeClaims(token);
  if (!claims) return { ok: false, error: 'The server returned an invalid session. Please try again.' };

  await setSession(token, claims.exp);
  redirect(safeNext(next, claims.role) ?? homeFor(claims.role));
}

export async function login(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const email = field(formData, 'email').trim();
  const password = field(formData, 'password');
  if (!email || !password) return { ok: false, error: 'Enter your email and password.' };
  return signIn(() => authApi.login(email, password), 'Invalid email or password.', field(formData, 'next'));
}

export async function demoLogin(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const role = field(formData, 'role');
  if (role !== Role.COACH && role !== Role.CLIENT) return { ok: false, error: 'Unknown demo role.' };
  return signIn(() => authApi.demo(role), 'Demo accounts are not seeded. Run `pnpm --filter api db:seed`.');
}

export async function logout(): Promise<void> {
  await clearSession();
  redirect('/login');
}
