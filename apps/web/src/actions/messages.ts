'use server';

import { unstable_rethrow } from 'next/navigation';
import { MESSAGE_LIMITS } from '@coaching/shared';
import type { MessageDto, MessageThreadDto, ThreadQuery } from '@coaching/shared';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { messagingApi } from '@/lib/api/endpoints';

async function run<T>(call: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await call() };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

function checkBody(body: string): string | null {
  const text = body.trim();
  if (!text) return 'Write a message first.';
  if (text.length > MESSAGE_LIMITS.maxBody) return `Keep messages under ${MESSAGE_LIMITS.maxBody} characters.`;
  return null;
}

/**
 * Thread calls for both sides. `clientId` set: the coach's thread with that client. Null: the client's thread
 * with their coach. The API enforces which one the session may use.
 */
export async function loadThread(clientId: string | null, query: ThreadQuery): Promise<ActionResult<MessageThreadDto>> {
  return run(() => (clientId ? messagingApi.thread(clientId, query) : messagingApi.myThread(query)));
}

export async function sendMessage(clientId: string | null, body: string): Promise<ActionResult<MessageDto>> {
  const problem = checkBody(body);
  if (problem) return { ok: false, error: problem };
  return run(() => (clientId ? messagingApi.send(clientId, body.trim()) : messagingApi.sendMine(body.trim())));
}

export async function markThreadRead(clientId: string | null): Promise<ActionResult> {
  return run(() => (clientId ? messagingApi.read(clientId) : messagingApi.readMine()));
}
