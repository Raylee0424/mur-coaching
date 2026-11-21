'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type {
  ClientSettingsDto,
  CoachClientStatus,
  CreateClientResponse,
  UpdateClientSettingsRequest,
} from '@coaching/shared';
import { clientsApi } from '@/lib/api/endpoints';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { formString } from '@/lib/form';

export async function createClient(
  _prev: ActionResult<CreateClientResponse> | null,
  formData: FormData,
): Promise<ActionResult<CreateClientResponse>> {
  const name = formString(formData, 'name').trim();
  const email = formString(formData, 'email').trim().toLowerCase();
  const notes = formString(formData, 'notes').trim();
  if (!name || !email) return { ok: false, error: 'Name and email are required.' };

  try {
    const data = await clientsApi.create({ name, email, ...(notes ? { notes } : {}) });
    revalidatePath('/coach/clients');
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

function refreshClient(clientId: string): void {
  revalidatePath('/coach/clients');
  revalidatePath(`/coach/clients/${clientId}`);
  revalidatePath('/coach/progression');
}

export async function updateClientSettings(
  clientId: string,
  body: UpdateClientSettingsRequest,
): Promise<ActionResult<ClientSettingsDto>> {
  try {
    const data = await clientsApi.updateSettings(clientId, body);
    refreshClient(clientId);
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

/** Pause, resume or archive. Archiving removes the coach's access, so the caller navigates away. */
export async function setClientStatus(clientId: string, status: CoachClientStatus): Promise<ActionResult> {
  try {
    await clientsApi.update(clientId, { status });
    refreshClient(clientId);
    return { ok: true, data: undefined };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}
