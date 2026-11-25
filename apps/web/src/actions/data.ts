'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type { ImportCommitRequest, ImportCommitResponse, ImportJobDto, ImportPreviewDto, ImportPreviewRequest } from '@coaching/shared';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { dataApi } from '@/lib/api/endpoints';

async function run<T>(call: () => Promise<T>, revalidate = true): Promise<ActionResult<T>> {
  try {
    const data = await call();
    if (revalidate) {
      revalidatePath('/client/settings/data');
      revalidatePath('/client/history');
      revalidatePath('/client/records');
      revalidatePath('/client/nutrition');
    }
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

/** Parses the file on the API and reports matches, duplicates and skipped rows. Writes nothing. */
export async function previewImport(input: ImportPreviewRequest): Promise<ActionResult<ImportPreviewDto>> {
  return run(() => dataApi.preview(input), false);
}

export async function commitImport(input: ImportCommitRequest): Promise<ActionResult<ImportCommitResponse>> {
  return run(() => dataApi.commit(input));
}

export async function rollbackImport(id: string): Promise<ActionResult<ImportJobDto>> {
  return run(() => dataApi.rollback(id));
}
