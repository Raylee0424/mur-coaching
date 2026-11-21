import 'server-only';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from './claims';

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** `exp` is the JWT expiry in epoch seconds; the cookie never outlives the token. */
export async function setSession(token: string, exp: number): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.max(1, exp - Math.floor(Date.now() / 1000)),
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
