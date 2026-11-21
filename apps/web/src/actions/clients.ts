'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type { CreateClientResponse } from '@coaching/shared';
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
