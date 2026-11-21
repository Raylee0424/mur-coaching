'use server';

import { revalidatePath } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import type { BaselineInput, ClientProfileDto, MeProfileDto, UpdateMeRequest } from '@coaching/shared';
import { authApi, meApi } from '@/lib/api/endpoints';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { getCurrentUser } from '@/lib/auth';
import { homeFor } from '@/lib/routes';

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

export async function saveAccount(body: UpdateMeRequest): Promise<ActionResult<unknown>> {
  return run(() => authApi.updateMe(body));
}

export async function saveProfile(body: Partial<ClientProfileDto>): Promise<ActionResult<MeProfileDto>> {
  return run(() => meApi.updateProfile(body));
}

export async function saveBaselines(rows: BaselineInput[]): Promise<ActionResult<MeProfileDto>> {
  return run(() => meApi.setBaselines(rows));
}

/** Marks onboarding done and sends the user home. */
export async function finishOnboarding(): Promise<ActionResult> {
  try {
    await meApi.completeOnboarding();
    revalidatePath('/', 'layout');
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
  const user = await getCurrentUser();
  redirect(homeFor(user.role));
}
