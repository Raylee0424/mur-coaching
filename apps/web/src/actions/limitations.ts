'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type { CreateLimitationRequest, LimitationDto, UpdateLimitationRequest } from '@coaching/shared';
import { limitationsApi } from '@/lib/api/endpoints';
import { toActionError, type ActionResult } from '@/lib/action-result';

/** Both the coach detail page and the client's own screens show limitations. */
function refresh(clientId: string): void {
  revalidatePath(`/coach/clients/${clientId}`);
  revalidatePath('/client');
  revalidatePath('/client/profile');
  revalidatePath('/client/log');
  revalidatePath('/client/exercises');
}

export async function createLimitation(clientId: string, body: CreateLimitationRequest): Promise<ActionResult<LimitationDto>> {
  try {
    const data = await limitationsApi.create(clientId, body);
    refresh(clientId);
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

export async function updateLimitation(clientId: string, id: string, body: UpdateLimitationRequest): Promise<ActionResult<LimitationDto>> {
  try {
    const data = await limitationsApi.update(clientId, id, body);
    refresh(clientId);
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

export async function deleteLimitation(clientId: string, id: string): Promise<ActionResult> {
  try {
    await limitationsApi.remove(clientId, id);
    refresh(clientId);
    return { ok: true, data: undefined };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}
