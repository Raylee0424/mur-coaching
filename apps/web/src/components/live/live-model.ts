import type { LogLiveSetRequest } from '@coaching/shared';

/** A set waiting to reach the API, with names kept for display while offline. */
export interface QueuedSet extends LogLiveSetRequest {
  exerciseName: string;
}

/** The API body for a queued set (display-only fields dropped). */
export function toRequest(item: QueuedSet): LogLiveSetRequest {
  const { requestId, clientId, exerciseId, weightKg, reps, rpe, cue } = item;
  return { requestId, clientId, exerciseId, weightKg, reps, rpe, cue };
}

export const queueKey = (sessionId: string): string => `mur.live.queue.${sessionId}`;

/** Corrupt or foreign storage reads as an empty queue. */
export function parseQueue(raw: string | null): QueuedSet[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is QueuedSet => typeof v === 'object' && v !== null && typeof (v as QueuedSet).requestId === 'string') : [];
  } catch {
    return [];
  }
}

/** Idempotent on requestId: re-queuing the same set never duplicates it. */
export function enqueue(queue: readonly QueuedSet[], item: QueuedSet): QueuedSet[] {
  return queue.some((q) => q.requestId === item.requestId) ? [...queue] : [...queue, item];
}

export function dequeue(queue: readonly QueuedSet[], requestId: string): QueuedSet[] {
  return queue.filter((q) => q.requestId !== requestId);
}

/** RFC 4122 v4. `crypto.randomUUID` only exists in secure contexts, so fall back to getRandomValues. */
export function newRequestId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Kg as the API's decimal string (2 places max). */
export const kgString = (kg: number): string => String(Math.round(kg * 100) / 100);
