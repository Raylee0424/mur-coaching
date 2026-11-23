'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type { ExerciseNoteDto } from '@coaching/shared';
import { exerciseNotesApi } from '@/lib/api/endpoints';
import { toActionError, type ActionResult } from '@/lib/action-result';

async function run<T>(op: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await op();
    revalidatePath('/client/log');
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

export async function createExerciseNote(exerciseId: string, body: string): Promise<ActionResult<ExerciseNoteDto>> {
  return run(() => exerciseNotesApi.create({ exerciseId, body }));
}

export async function updateExerciseNote(id: string, body: string): Promise<ActionResult<ExerciseNoteDto>> {
  return run(() => exerciseNotesApi.update(id, { body }));
}

export async function deleteExerciseNote(id: string): Promise<ActionResult> {
  return run(() => exerciseNotesApi.remove(id));
}
