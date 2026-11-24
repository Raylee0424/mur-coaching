'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { ScheduledStatus } from '@coaching/shared';
import { scheduleApi } from '@/lib/api/endpoints';
import { toActionError, type ActionResult } from '@/lib/action-result';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function refresh(clientId: string): void {
  revalidatePath(`/coach/clients/${clientId}`);
  revalidatePath('/client');
}

/** Moves a planned session to another day (today or later). The API enforces the rules. */
export async function moveScheduledWorkout(clientId: string, id: string, date: string): Promise<ActionResult> {
  if (!DAY.test(date)) return { ok: false, error: 'Choose a date.' };
  try {
    await scheduleApi.update(clientId, id, { date });
    refresh(clientId);
    return { ok: true, data: undefined };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

/** Skips a planned session (it leaves adherence) or restores a skipped one. */
export async function setScheduledStatus(clientId: string, id: string, status: 'PLANNED' | 'SKIPPED'): Promise<ActionResult> {
  try {
    await scheduleApi.update(clientId, id, { status: status === 'SKIPPED' ? ScheduledStatus.SKIPPED : ScheduledStatus.PLANNED });
    refresh(clientId);
    return { ok: true, data: undefined };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}
