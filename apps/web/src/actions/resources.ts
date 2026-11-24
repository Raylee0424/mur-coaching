'use server';

import { revalidatePath } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import type { CreateResourceRequest, CreateResourceResponse, RedirectUrlDto } from '@coaching/shared';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { resourcesApi } from '@/lib/api/endpoints';
import { formString } from '@/lib/form';

const PAGE = '/coach/resources';

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

/** Upload step 1. The browser then PUTs the file straight to R2 and calls completeResource. */
export async function reserveResource(body: CreateResourceRequest): Promise<ActionResult<CreateResourceResponse>> {
  return run(() => resourcesApi.create(body));
}

export async function completeResource(id: string): Promise<ActionResult> {
  const result = await run(() => resourcesApi.complete(id));
  return result.ok ? { ok: true, data: undefined } : result;
}

export async function shareResource(id: string, clientIds: string[]): Promise<ActionResult> {
  const result = await run(() => resourcesApi.share(id, { clientIds }));
  return result.ok ? { ok: true, data: undefined } : result;
}

export async function deleteResource(id: string): Promise<ActionResult> {
  return run(() => resourcesApi.remove(id));
}

async function goTo(request: () => Promise<RedirectUrlDto>): Promise<ActionResult> {
  let url: string;
  try {
    url = (await request()).url;
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
  redirect(url);
}

export async function openResource(id: string): Promise<ActionResult> {
  return goTo(() => resourcesApi.url(id));
}

/** Form action for the client's Open button (resource id in a hidden field). */
export async function openSharedResource(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const id = formString(formData, 'resourceId');
  if (!id) return { ok: false, error: 'Unknown file.' };
  return goTo(() => resourcesApi.mineUrl(id));
}
