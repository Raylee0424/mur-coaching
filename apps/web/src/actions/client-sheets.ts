'use server';

import { unstable_rethrow } from 'next/navigation';
import type { ExerciseAlternativesDto, ExplainDto } from '@coaching/shared';
import { exercisesApi, progressionApi } from '@/lib/api/endpoints';
import { toActionError, type ActionResult } from '@/lib/action-result';

/** "Why this call" for the client's own recommendation (the API rejects other clients' ids). */
export async function explainCall(recommendationId: string): Promise<ActionResult<ExplainDto>> {
  try {
    return { ok: true, data: await progressionApi.explain(recommendationId) };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

/** Swap picker: same-muscle alternatives with the client's own latest top set. */
export async function loadAlternatives(exerciseId: string): Promise<ActionResult<ExerciseAlternativesDto>> {
  try {
    return { ok: true, data: await exercisesApi.alternatives(exerciseId) };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}
