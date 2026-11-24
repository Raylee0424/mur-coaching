'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type {
  ClientSettingsDto,
  CoachClientStatus,
  CreateClientResponse,
  CreateInviteRequest,
  CreateInviteResponse,
  UpdateClientSettingsRequest,
  WeightUnit,
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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Creates an invite. The link is returned once; both delivery modes create the same invite. */
export async function createInvite(
  _prev: ActionResult<CreateInviteResponse> | null,
  formData: FormData,
): Promise<ActionResult<CreateInviteResponse>> {
  const name = formString(formData, 'name').trim();
  const email = formString(formData, 'email').trim().toLowerCase();
  const phone = formString(formData, 'phone').trim();
  const programId = formString(formData, 'programId');
  const leadId = formString(formData, 'leadId');
  const startDate = formString(formData, 'startDate');
  const unit = formString(formData, 'weightUnit');
  if (!name || !email) return { ok: false, error: 'Name and email are required.' };
  if (startDate && !DATE_RE.test(startDate)) return { ok: false, error: 'Choose a valid start date.' };

  const body: CreateInviteRequest = {
    name,
    email,
    ...(phone ? { phone } : {}),
    ...(leadId ? { leadId } : {}),
    ...(programId ? { programId, ...(startDate ? { startDate } : {}) } : {}),
    ...(unit === 'KG' || unit === 'LB' ? { weightUnit: unit as WeightUnit } : {}),
  };
  try {
    const data = await clientsApi.createInvite(body);
    revalidatePath('/coach/clients');
    if (leadId) revalidatePath('/coach/leads');
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

export async function revokeInvite(id: string): Promise<ActionResult> {
  try {
    await clientsApi.revokeInvite(id);
    revalidatePath('/coach/clients');
    return { ok: true, data: undefined };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

/** Private coach notes (never shown to the client). */
export async function saveClientNotes(clientId: string, notes: string): Promise<ActionResult> {
  if (notes.length > 2000) return { ok: false, error: 'Notes can be at most 2000 characters.' };
  try {
    await clientsApi.update(clientId, { notes });
    revalidatePath(`/coach/clients/${clientId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}
