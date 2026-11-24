'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type { CreateSessionFeedbackRequest, SessionFeedbackDto, UpdateSessionFeedbackRequest } from '@coaching/shared';
import { sessionReviewApi } from '@/lib/api/endpoints';
import { toActionError, type ActionResult } from '@/lib/action-result';

function refresh(clientId: string, logId: string): void {
  revalidatePath(`/coach/clients/${clientId}/sessions/${logId}`);
  // Pinned comments show on the client's Today.
  revalidatePath('/client');
}

export async function addFeedback(clientId: string, logId: string, body: CreateSessionFeedbackRequest): Promise<ActionResult<SessionFeedbackDto>> {
  if (!body.body.trim()) return { ok: false, error: 'Write a comment first.' };
  try {
    const data = await sessionReviewApi.addFeedback(clientId, logId, { ...body, body: body.body.trim() });
    refresh(clientId, logId);
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

export async function updateFeedback(clientId: string, logId: string, id: string, body: UpdateSessionFeedbackRequest): Promise<ActionResult<SessionFeedbackDto>> {
  if (body.body !== undefined && !body.body.trim()) return { ok: false, error: 'A comment cannot be empty.' };
  try {
    const data = await sessionReviewApi.updateFeedback(clientId, id, body.body === undefined ? body : { ...body, body: body.body.trim() });
    refresh(clientId, logId);
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

export async function removeFeedback(clientId: string, logId: string, id: string): Promise<ActionResult> {
  try {
    await sessionReviewApi.removeFeedback(clientId, id);
    refresh(clientId, logId);
    return { ok: true, data: undefined };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}
