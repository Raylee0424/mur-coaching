'use server';

import { revalidatePath } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import type { CreateWorkoutLogRequest } from '@coaching/shared';
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
