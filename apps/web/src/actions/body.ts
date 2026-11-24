'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type { CreateProgressPhotoRequest, CreateProgressPhotoResponse, SaveBodyGoalRequest } from '@coaching/shared';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { bodyApi } from '@/lib/api/endpoints';

const PAGE = '/client/body';

async function run<T>(call: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await call();
    revalidatePath(PAGE);
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

/** `weightKg` is already converted from the display unit by the form. */
export async function logBodyweight(date: string, weightKg: string): Promise<ActionResult> {
  return run(() => bodyApi.log({ date, weightKg }));
}

export async function deleteBodyweight(date: string): Promise<ActionResult> {
  return run(() => bodyApi.removeEntry(date));
}

export async function saveBodyGoal(input: SaveBodyGoalRequest): Promise<ActionResult> {
  return run(() => bodyApi.saveGoal(input));
}

export async function clearBodyGoal(): Promise<ActionResult> {
  return run(() => bodyApi.removeGoal());
}

/** Photo upload step 1. The browser then PUTs the re-encoded JPEG to R2 and calls completeProgressPhoto. */
export async function reserveProgressPhoto(input: CreateProgressPhotoRequest): Promise<ActionResult<CreateProgressPhotoResponse>> {
  return run(() => bodyApi.reservePhoto(input));
}

export async function completeProgressPhoto(id: string): Promise<ActionResult> {
  return run(() => bodyApi.completePhoto(id));
}

export async function shareProgressPhoto(id: string, sharedWithCoach: boolean): Promise<ActionResult> {
  return run(() => bodyApi.sharePhoto(id, sharedWithCoach));
}

export async function deleteProgressPhoto(id: string): Promise<ActionResult> {
  return run(() => bodyApi.removePhoto(id));
}
