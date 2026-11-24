'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type { AutomationCandidateDto, RunAutomationsResultDto, SaveAutomationRuleRequest } from '@coaching/shared';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { automationsApi } from '@/lib/api/endpoints';

const PAGE = '/coach/automations';

async function run<T>(call: () => Promise<T>, revalidate = true): Promise<ActionResult<T>> {
  try {
    const data = await call();
    if (revalidate) revalidatePath(PAGE);
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

/** `id` null creates. */
export async function saveAutomationRule(id: string | null, input: SaveAutomationRuleRequest): Promise<ActionResult> {
  return run(async () => {
    await (id ? automationsApi.update(id, input) : automationsApi.create(input));
  });
}

export async function deleteAutomationRule(id: string): Promise<ActionResult> {
  return run(() => automationsApi.remove(id));
}

export async function dryRunAutomation(id: string): Promise<ActionResult<AutomationCandidateDto[]>> {
  return run(() => automationsApi.dryRun(id), false);
}

export async function runAutomationsNow(): Promise<ActionResult<RunAutomationsResultDto>> {
  return run(() => automationsApi.run());
}
