'use server';

import { revalidatePath } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import type { ClientProgramConflictsDto, ProgramDto, ProgramTreeInput } from '@coaching/shared';
import { programsApi } from '@/lib/api/endpoints';
import { toActionError, type ActionResult } from '@/lib/action-result';

function refresh(programId?: string): void {
  revalidatePath('/coach/programs');
  if (programId) revalidatePath(`/coach/programs/${programId}`);
  revalidatePath('/coach/clients');
}

/** Creates (id null) or replaces the whole tree. Returns the saved program with server ids. */
export async function saveProgram(id: string | null, input: ProgramTreeInput): Promise<ActionResult<ProgramDto>> {
  try {
    const data = id ? await programsApi.replace(id, input) : await programsApi.create(input);
    refresh(data.id);
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

export async function deleteProgram(id: string): Promise<ActionResult> {
  try {
    await programsApi.remove(id);
    refresh();
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
  redirect('/coach/programs');
}

export interface AssignOutcome {
  clientId: string;
  ok: boolean;
  error?: string;
}

/** One assignment per client; each replaces that client's current program. Partial success is reported. */
export async function assignProgram(
  programId: string,
  clientIds: string[],
  startDate: string,
): Promise<ActionResult<AssignOutcome[]>> {
  if (clientIds.length === 0) return { ok: false, error: 'Choose at least one client.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return { ok: false, error: 'Choose a start date.' };
  const outcomes: AssignOutcome[] = [];
  for (const clientId of clientIds) {
    try {
      await programsApi.assign(clientId, { programId, startDate });
      outcomes.push({ clientId, ok: true });
      revalidatePath(`/coach/clients/${clientId}`);
    } catch (err) {
      unstable_rethrow(err);
      const e = toActionError(err);
      outcomes.push({ clientId, ok: false, error: e.error });
    }
  }
  refresh(programId);
  return { ok: true, data: outcomes };
}

/** Read-only: limitation conflicts for these clients against the saved program. Advisory; never blocks assigning. */
export async function programConflicts(programId: string, clientIds: string[]): Promise<ActionResult<ClientProgramConflictsDto[]>> {
  if (clientIds.length === 0) return { ok: true, data: [] };
  try {
    return { ok: true, data: await programsApi.conflicts(programId, clientIds) };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

/** "Save as template": a deep copy of the saved program flagged as a template (no assignments). */
export async function saveAsTemplate(programId: string, name?: string): Promise<ActionResult<ProgramDto>> {
  try {
    const data = await programsApi.duplicate(programId, { asTemplate: true, ...(name?.trim() ? { name: name.trim() } : {}) });
    refresh(data.id);
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

/** Copy as a regular, editable program. */
export async function duplicateProgram(programId: string): Promise<ActionResult<ProgramDto>> {
  try {
    const data = await programsApi.duplicate(programId, {});
    refresh(data.id);
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}
