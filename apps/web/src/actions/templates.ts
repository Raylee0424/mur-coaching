'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type {
  CreateWorkoutTemplateRequest,
  TemplateFolderDto,
  UpdateWorkoutTemplateRequest,
  WorkoutTemplateDto,
} from '@coaching/shared';
import { templatesApi } from '@/lib/api/endpoints';
import { toActionError, type ActionResult } from '@/lib/action-result';

/** Runs an API write, refreshes the logger (template picker) and maps failures to an `ActionResult`. */
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

export const createTemplateFolder = (name: string): Promise<ActionResult<TemplateFolderDto>> =>
  run(() => templatesApi.createFolder({ name }));

export const renameTemplateFolder = (id: string, name: string): Promise<ActionResult<TemplateFolderDto>> =>
  run(() => templatesApi.renameFolder(id, { name }));

export const deleteTemplateFolder = (id: string): Promise<ActionResult> => run(() => templatesApi.removeFolder(id));

export const createWorkoutTemplate = (body: CreateWorkoutTemplateRequest): Promise<ActionResult<WorkoutTemplateDto>> =>
  run(() => templatesApi.create(body));

export const updateWorkoutTemplate = (id: string, body: UpdateWorkoutTemplateRequest): Promise<ActionResult<WorkoutTemplateDto>> =>
  run(() => templatesApi.update(id, body));

export const deleteWorkoutTemplate = (id: string): Promise<ActionResult> => run(() => templatesApi.remove(id));
