'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type {
  CoachEngineRulesDto,
  EnginePreviewRequest,
  EnginePreviewResponse,
  UpdateCoachEngineRulesRequest,
} from '@coaching/shared';
import { engineRulesApi } from '@/lib/api/endpoints';
import { toActionError, type ActionResult } from '@/lib/action-result';

async function run<T>(fn: () => Promise<T>, revalidate = true): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    if (revalidate) revalidatePath('/coach/settings');
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

export async function saveEngineRules(rules: UpdateCoachEngineRulesRequest): Promise<ActionResult<CoachEngineRulesDto>> {
  return run(() => engineRulesApi.replace(rules));
}

export async function resetEngineRules(): Promise<ActionResult<CoachEngineRulesDto>> {
  return run(() => engineRulesApi.reset());
}

/** Read-only: runs the engine with draft rules. */
export async function previewEngineRules(request: EnginePreviewRequest): Promise<ActionResult<EnginePreviewResponse>> {
  return run(() => engineRulesApi.preview(request), false);
}

/** Read-only: the coach's stored rules, for the what-if simulator in the call drawer. */
export async function loadEngineRules(): Promise<ActionResult<CoachEngineRulesDto>> {
  return run(() => engineRulesApi.get(), false);
}
