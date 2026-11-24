'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type { ReadinessDto, SaveCycleEntryRequest, SaveReadinessRequest } from '@coaching/shared';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { readinessApi } from '@/lib/api/endpoints';

async function run<T>(call: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await call();
    revalidatePath('/client');
    revalidatePath('/client/body');
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

export async function saveReadiness(input: SaveReadinessRequest): Promise<ActionResult<ReadinessDto>> {
  return run(() => readinessApi.save(input));
}

export async function saveCycleEntry(input: SaveCycleEntryRequest): Promise<ActionResult> {
  return run(() => readinessApi.saveCycle(input));
}

export async function deleteCycleEntry(date: string): Promise<ActionResult> {
  return run(() => readinessApi.removeCycle(date));
}

export async function setCycleSharing(sharedWithCoach: boolean): Promise<ActionResult> {
  return run(() => readinessApi.shareCycle(sharedWithCoach));
}
