'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type { CreateWorkoutLogRequest, NextTarget, UpdateWorkoutLogRequest } from '@coaching/shared';
import { workoutLogsApi } from '@/lib/api/endpoints';
import { toActionError, type ActionResult } from '@/lib/action-result';

export interface SubmittedWorkout {
  logId: string;
  /** Engine calls after this session; empty when they could not be read yet. */
  targets: NextTarget[];
}

/**
 * Saves a finished session and reads back the next targets for the "session complete" screen.
 * The API re-validates everything (whitelisted DTO); this only forwards the typed request.
 */
export async function submitWorkoutLog(request: CreateWorkoutLogRequest): Promise<ActionResult<SubmittedWorkout>> {
  try {
    const log = await workoutLogsApi.create(request);
    revalidatePath('/client');
    revalidatePath('/client/history');
    revalidatePath('/client/lifts/[exerciseId]', 'page');
    const targets = await workoutLogsApi
      .nextTargets(log.id)
      .then((r) => r.targets)
      .catch(() => []);
    return { ok: true, data: { logId: log.id, targets } };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
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
