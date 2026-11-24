'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { validateCheckInTemplate } from '@coaching/shared';
import type { CreateCheckInScheduleRequest, SaveCheckInTemplateRequest, SubmitCheckInRequest } from '@coaching/shared';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { checkInsApi } from '@/lib/api/endpoints';

const COACH_PAGE = '/coach/check-ins';
const CLIENT_PAGE = '/client/check-in';

async function run(call: () => Promise<unknown>, path: string): Promise<ActionResult> {
  try {
    await call();
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
  revalidatePath(path);
  return { ok: true, data: undefined };
}

/** Creates when `id` is null, otherwise replaces the questions. The same pure check runs in the API. */
export async function saveCheckInTemplate(id: string | null, input: SaveCheckInTemplateRequest): Promise<ActionResult> {
  const problem = validateCheckInTemplate(input);
  if (problem) return { ok: false, error: problem };
  return run(() => (id ? checkInsApi.updateTemplate(id, input) : checkInsApi.createTemplate(input)), COACH_PAGE);
}

export async function deleteCheckInTemplate(id: string): Promise<ActionResult> {
  return run(() => checkInsApi.removeTemplate(id), COACH_PAGE);
}

export async function assignCheckIn(input: CreateCheckInScheduleRequest): Promise<ActionResult> {
  return run(() => checkInsApi.assign(input), COACH_PAGE);
}

export async function unassignCheckIn(scheduleId: string): Promise<ActionResult> {
  return run(() => checkInsApi.unassign(scheduleId), COACH_PAGE);
}

export async function reviewCheckIn(id: string, reviewed: boolean, reply?: string): Promise<ActionResult> {
  return run(() => checkInsApi.review(id, { reviewed, ...(reply !== undefined ? { reply } : {}) }), COACH_PAGE);
}

export async function submitCheckIn(scheduleId: string, input: SubmitCheckInRequest): Promise<ActionResult> {
  return run(() => checkInsApi.submit(scheduleId, input), CLIENT_PAGE);
}
