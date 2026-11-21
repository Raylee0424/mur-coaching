'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type {
  BulkResolveResponse,
  ExplainDto,
  OverrideRecommendationRequest,
  RecommendationDto,
  ResolvableStatus,
} from '@coaching/shared';
import { ApiError } from '@/lib/api/client';
import { progressionApi } from '@/lib/api/endpoints';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { formString } from '@/lib/form';

function refresh(clientId: string): void {
  revalidatePath(`/coach/clients/${clientId}`);
  revalidatePath('/coach/progression');
  revalidatePath('/client');
  revalidatePath('/client/lifts/[exerciseId]', 'page');
}

/** Accept / dismiss / re-evaluate one recommendation. `intent` is the clicked button's value. */
export async function recommendationAction(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  const clientId = formString(formData, 'clientId');
  const recommendationId = formString(formData, 'recommendationId');
  const exerciseId = formString(formData, 'exerciseId');
  const intent = formString(formData, 'intent');
  if (!clientId || !recommendationId) return { ok: false, error: 'Missing recommendation.' };

  try {
    if (intent === 'ACCEPTED' || intent === 'DISMISSED') {
      await progressionApi.resolve(recommendationId, intent);
      refresh(clientId);
      return { ok: true, data: intent === 'ACCEPTED' ? 'Accepted' : 'Dismissed' };
    }
    if (intent === 'REEVALUATE' && exerciseId) {
      await progressionApi.evaluateOne(clientId, exerciseId);
      refresh(clientId);
      return { ok: true, data: 'Re-evaluated' };
    }
    return { ok: false, error: 'Unknown action.' };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof ApiError && err.status === 409) {
      refresh(clientId);
      return { ok: false, error: 'This recommendation was already resolved or replaced.' };
    }
    return toActionError(err);
  }
}

export async function evaluateAll(
  _prev: ActionResult<{ count: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ count: number }>> {
  const clientId = formString(formData, 'clientId');
  if (!clientId) return { ok: false, error: 'Missing client.' };

  try {
    const results = await progressionApi.evaluateAll(clientId);
    refresh(clientId);
    return { ok: true, data: { count: results.length } };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

/** Coach replaces the engine's target. The engine's own call stays on the record. */
export async function overrideRecommendation(
  clientId: string,
  recommendationId: string,
  body: OverrideRecommendationRequest,
): Promise<ActionResult<RecommendationDto>> {
  try {
    const data = await progressionApi.override(recommendationId, body);
    refresh(clientId);
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof ApiError && err.status === 409) {
      refresh(clientId);
      return { ok: false, error: 'This recommendation was dismissed or replaced. Re-evaluate to get a fresh one.' };
    }
    return toActionError(err);
  }
}

/** Read-only: loads the "why this call" trace for the coach drawer. */
export async function explainRecommendation(recommendationId: string): Promise<ActionResult<ExplainDto>> {
  try {
    return { ok: true, data: await progressionApi.explain(recommendationId) };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

/** Accept or dismiss many queue rows at once. Rows no longer pending come back as skipped. */
export async function bulkResolveRecommendations(
  ids: string[],
  status: ResolvableStatus,
): Promise<ActionResult<BulkResolveResponse>> {
  if (ids.length === 0) return { ok: false, error: 'Select at least one recommendation.' };
  try {
    const data = await progressionApi.bulkResolve({ ids, status });
    revalidatePath('/coach/progression');
    revalidatePath('/coach/clients');
    revalidatePath('/coach/clients/[clientId]', 'page');
    revalidatePath('/client');
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof ApiError && err.status === 404) {
      revalidatePath('/coach/progression');
      return { ok: false, error: 'Some of these recommendations no longer exist. The list has been refreshed.' };
    }
    return toActionError(err);
  }
}
