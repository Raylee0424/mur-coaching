'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type { ModerationReportDto, ReportStatus } from '@coaching/shared';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { moderationApi } from '@/lib/api/endpoints';

async function run<T>(call: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await call();
    revalidatePath('/moderation');
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

export async function setReportStatus(id: string, status: ReportStatus): Promise<ActionResult<ModerationReportDto>> {
  return run(() => moderationApi.setStatus(id, status));
}
