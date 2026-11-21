'use server';

import { revalidatePath } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import type { CreateWorkoutLogRequest, UpdateWorkoutLogRequest } from '@coaching/shared';
import { workoutLogsApi } from '@/lib/api/endpoints';
import { toActionError, type ActionResult } from '@/lib/action-result';

/** The API re-validates everything (whitelisted DTO); this only forwards the typed request. */
export async function createWorkoutLog(request: CreateWorkoutLogRequest): Promise<ActionResult> {
  try {
    await workoutLogsApi.create(request);
    revalidatePath('/client');
    revalidatePath('/client/history');
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
  redirect('/client/history?logged=1');
}

function refreshLogs(): void {
  revalidatePath('/client');
  revalidatePath('/client/history');
  revalidatePath('/client/lifts/[exerciseId]', 'page');
}

/** Corrects a logged session (the API re-runs the engine for affected lifts). */
export async function updateWorkoutLog(id: string, body: UpdateWorkoutLogRequest): Promise<ActionResult> {
  try {
    await workoutLogsApi.update(id, body);
    refreshLogs();
    return { ok: true, data: undefined };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

export async function deleteWorkoutLog(id: string): Promise<ActionResult> {
  try {
    await workoutLogsApi.remove(id);
    refreshLogs();
    return { ok: true, data: undefined };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}
