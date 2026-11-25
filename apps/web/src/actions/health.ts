'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type { HealthMetricInput, HealthSource, SyncHealthMetricsResponse } from '@coaching/shared';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { healthApi } from '@/lib/api/endpoints';

async function run<T>(call: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await call();
    revalidatePath('/client/health');
    revalidatePath('/client/check-in');
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

/** One batch (≤ 400 days). The import component splits larger files into several calls. */
export async function syncHealthMetrics(source: HealthSource, entries: HealthMetricInput[]): Promise<ActionResult<SyncHealthMetricsResponse>> {
  return run(() => healthApi.sync({ source, entries }));
}

export async function saveStepGoal(dailySteps: number): Promise<ActionResult> {
  return run(() => healthApi.saveGoal(dailySteps));
}
