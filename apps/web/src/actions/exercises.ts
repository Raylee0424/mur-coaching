'use server';

import { revalidatePath } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import type { CreateExerciseRequest, ExerciseDto, UpdateExerciseRequest } from '@coaching/shared';
import { exercisesApi } from '@/lib/api/endpoints';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { formString, isMuscleGroup } from '@/lib/form';

type Parsed = { ok: true; value: CreateExerciseRequest } | { ok: false; error: string };

function parse(formData: FormData, prefix = ''): Parsed {
  const name = formString(formData, `${prefix}name`).trim();
  const muscleGroup = formString(formData, `${prefix}muscleGroup`);
  const equipment = formString(formData, `${prefix}equipment`).trim();
  const increment = formString(formData, `${prefix}loadIncrementKg`).trim();

  if (!name) return { ok: false, error: 'Name is required.' };
  if (!isMuscleGroup(muscleGroup)) return { ok: false, error: 'Choose a muscle group.' };
  const loadIncrementKg = increment === '' ? undefined : Number(increment);
  if (loadIncrementKg !== undefined && !Number.isFinite(loadIncrementKg)) {
    return { ok: false, error: 'Load increment must be a number.' };
  }
  return {
    ok: true,
    value: {
      name,
      muscleGroup,
      ...(equipment ? { equipment } : {}),
      ...(loadIncrementKg !== undefined ? { loadIncrementKg } : {}),
    },
  };
}

export async function createExercise(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  const parsed = parse(formData);
  if (!parsed.ok) return parsed;

  try {
    const created = await exercisesApi.create(parsed.value);
    revalidatePath('/coach/exercises');
    revalidatePath('/welcome/coach');
    return { ok: true, data: created.name };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

/** Sends only fields that differ from the `initial_*` values the form was rendered with. */
export async function updateExercise(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  const id = formString(formData, 'id');
  const returnTo = formString(formData, 'returnTo');
  const parsed = parse(formData);
  if (!id) return { ok: false, error: 'Missing exercise.' };
  if (!parsed.ok) return parsed;

  const initial = parse(formData, 'initial_');
  const before = initial.ok ? initial.value : null;
  const next = parsed.value;
  const changes: UpdateExerciseRequest = {};
  if (next.name !== before?.name) changes.name = next.name;
  if (next.muscleGroup !== before?.muscleGroup) changes.muscleGroup = next.muscleGroup;
  if ((next.equipment ?? '') !== (before?.equipment ?? '')) changes.equipment = next.equipment ?? '';
  if (next.loadIncrementKg !== undefined && next.loadIncrementKg !== before?.loadIncrementKg) {
    changes.loadIncrementKg = next.loadIncrementKg;
  }

  try {
    if (Object.keys(changes).length > 0) await exercisesApi.update(id, changes);
    revalidatePath('/coach/exercises');
    revalidatePath('/welcome/coach');
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
  redirect(returnTo.startsWith('/coach/exercises') ? returnTo : '/coach/exercises');
}

function refreshExercises(): void {
  revalidatePath('/coach/exercises');
  revalidatePath('/welcome/coach');
  revalidatePath('/coach/programs', 'layout');
}

/** Creates (id null) or updates one exercise from the drawer. `null` clears an exercise rule. */
export async function saveExercise(id: string | null, body: CreateExerciseRequest): Promise<ActionResult<ExerciseDto>> {
  try {
    const data = id ? await exercisesApi.update(id, body) : await exercisesApi.create(body);
    refreshExercises();
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

/** Copy of a global or own exercise, named "X (copy)". */
export async function duplicateExercise(id: string): Promise<ActionResult<ExerciseDto>> {
  try {
    const data = await exercisesApi.duplicate(id);
    refreshExercises();
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

/** Soft delete: programs, logs and recommendations keep working. */
export async function archiveExercise(id: string): Promise<ActionResult> {
  try {
    await exercisesApi.archive(id);
    refreshExercises();
    return { ok: true, data: undefined };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}
