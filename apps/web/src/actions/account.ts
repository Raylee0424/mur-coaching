'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { WeightUnit } from '@coaching/shared';
import { authApi } from '@/lib/api/endpoints';
import { formString } from '@/lib/form';
import { TARGETS_INTRO_COOKIE } from '@/lib/session';

/** Switches the signed-in user's display unit; every page re-renders with it. Failures reach error.tsx. */
export async function setWeightUnit(formData: FormData): Promise<void> {
  const unit = formString(formData, 'unit');
  if (unit !== WeightUnit.KG && unit !== WeightUnit.LB) throw new Error('Unknown unit.');
  await authApi.updateMe({ weightUnit: unit });
  revalidatePath('/', 'layout');
}

/** Hides the "How your targets work" card on Today. No user-preference store exists, so it is per browser. */
export async function dismissTargetsIntro(): Promise<void> {
  (await cookies()).set(TARGETS_INTRO_COOKIE, 'dismissed', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath('/client');
}
