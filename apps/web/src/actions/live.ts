'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type { LiveSessionDto, LogLiveSetRequest, StartLiveSessionRequest } from '@coaching/shared';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { liveApi } from '@/lib/api/endpoints';

const PAGE = '/coach/sessions/live';

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

export async function startLiveSession(input: StartLiveSessionRequest): Promise<ActionResult<LiveSessionDto>> {
  return run(() => liveApi.start(input));
}

/** Not revalidated: the console updates from the returned session and the offline queue replays here. */
export async function logLiveSet(sessionId: string, input: LogLiveSetRequest): Promise<ActionResult<LiveSessionDto>> {
  return run(() => liveApi.logSet(sessionId, input), false);
}

export async function removeLiveSet(sessionId: string, setLogId: string): Promise<ActionResult<LiveSessionDto>> {
  return run(() => liveApi.removeSet(sessionId, setLogId), false);
}

export async function endLiveSession(sessionId: string): Promise<ActionResult> {
  return run(() => liveApi.end(sessionId));
}

/** Client side: polled by the read-only live view. */
export async function loadMyLiveSession(): Promise<ActionResult<LiveSessionDto | null>> {
  return run(async () => (await liveApi.mine()).session, false);
}
