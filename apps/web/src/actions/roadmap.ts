'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { validateRoadmap } from '@coaching/shared';
import type { RoadmapInput } from '@coaching/shared';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { roadmapApi } from '@/lib/api/endpoints';

/** The editor owns the whole roadmap; saving replaces it. The same pure check runs here and in the API. */
export async function saveRoadmap(clientId: string, input: RoadmapInput): Promise<ActionResult> {
  const problem = validateRoadmap(input);
  if (problem) return { ok: false, error: problem };
  try {
    await roadmapApi.save(clientId, input);
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
  revalidatePath(`/coach/clients/${clientId}/roadmap`);
  revalidatePath('/client/roadmap');
  return { ok: true, data: undefined };
}

export async function deleteRoadmap(clientId: string): Promise<ActionResult> {
  try {
    await roadmapApi.remove(clientId);
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
  revalidatePath(`/coach/clients/${clientId}/roadmap`);
  revalidatePath('/client/roadmap');
  return { ok: true, data: undefined };
}
