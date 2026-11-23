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
    revalidatePath('/client/templates');
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

export async function createTemplateFolder(name: string): Promise<ActionResult<TemplateFolderDto>> {
  return run(() => templatesApi.createFolder({ name }));
}

export async function renameTemplateFolder(id: string, name: string): Promise<ActionResult<TemplateFolderDto>> {
  return run(() => templatesApi.renameFolder(id, { name }));
}

export async function deleteTemplateFolder(id: string): Promise<ActionResult> {
  return run(() => templatesApi.removeFolder(id));
}

export async function createWorkoutTemplate(body: CreateWorkoutTemplateRequest): Promise<ActionResult<WorkoutTemplateDto>> {
  return run(() => templatesApi.create(body));
}

export async function updateWorkoutTemplate(id: string, body: UpdateWorkoutTemplateRequest): Promise<ActionResult<WorkoutTemplateDto>> {
  return run(() => templatesApi.update(id, body));
}

export async function deleteWorkoutTemplate(id: string): Promise<ActionResult> {
  return run(() => templatesApi.remove(id));
}
