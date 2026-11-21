'use server';

import { revalidatePath } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import type { BaselineInput, ClientProfileDto, CreateInviteResponse, MeProfileDto, UpdateMeRequest } from '@coaching/shared';
import { authApi, clientsApi, meApi } from '@/lib/api/endpoints';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { getCurrentUser } from '@/lib/auth';
import { formString } from '@/lib/form';
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

/** Step 4: invite the first client. The link is only returned now, so the caller must show it. */
export async function inviteFirstClient(
  _prev: ActionResult<CreateInviteResponse> | null,
  formData: FormData,
): Promise<ActionResult<CreateInviteResponse>> {
  const name = formString(formData, 'name').trim();
  const email = formString(formData, 'email').trim().toLowerCase();
  if (!name || !email) return { ok: false, error: 'Enter your client\'s name and email.' };
  const result = await run(() => clientsApi.createInvite({ name, email }));
  if (result.ok) revalidatePath('/coach/clients');
  return result;
}
