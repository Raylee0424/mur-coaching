import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { AuthUser, Role } from '@coaching/shared';
import { authApi } from '@/lib/api/endpoints';
import { homeFor } from '@/lib/routes';

/** Deduped per request: layouts and pages can both call it for one /auth/me round trip. */
export const getCurrentUser = cache((): Promise<AuthUser> => authApi.me());

/** Authoritative role gate (middleware only reads unverified claims). */
export async function requireUser(role: Role): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (user.role !== role) redirect(homeFor(user.role));
  return user;
}
