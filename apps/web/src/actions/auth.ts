'use server';

import { redirect, unstable_rethrow } from 'next/navigation';
import { PASSWORD_RULE_MESSAGE, Role, isValidPassword } from '@coaching/shared';
import type { AuthTokenResponse } from '@coaching/shared';
import { ApiError } from '@/lib/api/client';
import { authApi, invitesApi } from '@/lib/api/endpoints';
import { isCompleteCode, type LoginState } from '@/components/shell/auth/auth-model';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { decodeClaims } from '@/lib/claims';
import { formString as field } from '@/lib/form';
import { homeFor, onboardingFor, safeNext } from '@/lib/routes';
import { clearSession, setSession } from '@/lib/session';

/** Runs the sign-in request, stores the session cookie and redirects. Only returns on failure. */
async function signIn(
  request: () => Promise<AuthTokenResponse>,
  rejected: string,
  next?: string | null,
  /** Where to go instead of the role home (e.g. onboarding after signup). */
  destination?: (role: Role) => string,
): Promise<NonNullable<LoginState>> {
  let token: string;
  try {
    token = (await request()).accessToken;
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
      return { ok: false, error: rejected };
    }
    if (err instanceof ApiError && err.status === 423) return { ok: false, error: err.messages.join(' '), locked: true };
    return toActionError(err);
  }

  const claims = decodeClaims(token);
  if (!claims) return { ok: false, error: 'The server returned an invalid session. Please try again.' };

  await setSession(token, claims.exp);
  redirect(destination?.(claims.role) ?? safeNext(next, claims.role) ?? homeFor(claims.role));
}

export async function login(_prev: LoginState, formData: FormData): Promise<NonNullable<LoginState>> {
  const email = field(formData, 'email').trim();
  const password = field(formData, 'password');
  if (!email || !password) return { ok: false, error: 'Enter your email and password.' };
  return signIn(() => authApi.login(email, password), 'Incorrect email or password.', field(formData, 'next'));
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

export async function signup(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const name = field(formData, 'name').trim();
  const email = field(formData, 'email').trim().toLowerCase();
  const password = field(formData, 'password');
  const role = field(formData, 'role');
  if (role !== Role.COACH && role !== Role.CLIENT) return { ok: false, error: 'Choose whether you are a coach or a client.' };
  if (!name || !email) return { ok: false, error: 'Enter your name and email.' };
  if (!isValidPassword(password)) return { ok: false, error: PASSWORD_RULE_MESSAGE };
  if (field(formData, 'terms') !== 'on') return { ok: false, error: 'Agree to the Terms of Service and Privacy Policy to continue.' };
  const result = await signIn(
    () => authApi.signup({ name, email, password, role }),
    'Could not create the account.',
    null,
    () => '/verify',
  );
  if (result.error.toLowerCase().includes('exist')) {
    return { ok: false, error: 'An account with that email already exists. Try signing in instead.' };
  }
  return result;
}

export async function verifyEmail(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const code = field(formData, 'code').trim();
  if (!isCompleteCode(code)) return { ok: false, error: 'Enter the 6-digit code.' };
  let target: string;
  try {
    const user = await authApi.verifyEmail({ code });
    target = user.onboardedAt ? homeFor(user.role) : onboardingFor(user.role);
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
      return { ok: false, error: err.messages.join(' ') || 'Incorrect verification code. Please check your inbox and try again.' };
    }
    return toActionError(err);
  }
  redirect(target);
}

export async function resendVerification(): Promise<ActionResult> {
  try {
    await authApi.resendVerification();
    return { ok: true, data: undefined };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

export async function forgotPassword(_prev: ActionResult<{ email: string }> | null, formData: FormData): Promise<ActionResult<{ email: string }>> {
  const email = field(formData, 'email').trim().toLowerCase();
  if (!email) return { ok: false, error: 'Enter your email.' };
  try {
    await authApi.forgotPassword({ email });
    return { ok: true, data: { email } };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

export async function resetPassword(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const token = field(formData, 'token');
  const password = field(formData, 'password');
  if (!token) return { ok: false, error: 'This reset link is missing its token. Request a new one.' };
  if (!isValidPassword(password)) return { ok: false, error: PASSWORD_RULE_MESSAGE };
  if (password !== field(formData, 'confirm')) return { ok: false, error: 'Passwords do not match.' };
  try {
    await authApi.resetPassword({ token, password });
    return { ok: true, data: undefined };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof ApiError && (err.status === 400 || err.status === 404 || err.status === 410)) {
      return { ok: false, error: 'This reset link is invalid or has expired. Request a new one.' };
    }
    return toActionError(err);
  }
}

export async function acceptInvite(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const token = field(formData, 'token');
  const name = field(formData, 'name').trim();
  const password = field(formData, 'password');
  if (!name) return { ok: false, error: 'Enter your name.' };
  if (!isValidPassword(password)) return { ok: false, error: PASSWORD_RULE_MESSAGE };
  let accessToken: string;
  try {
    accessToken = (await invitesApi.accept(token, { name, password })).accessToken;
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof ApiError && (err.status === 404 || err.status === 410)) {
      return { ok: false, error: 'This invite link is no longer valid. Ask your coach for a new one.' };
    }
    return toActionError(err);
  }
  const claims = decodeClaims(accessToken);
  if (!claims) return { ok: false, error: 'The server returned an invalid session. Please try again.' };
  await setSession(accessToken, claims.exp);
  redirect(onboardingFor(claims.role));
}
