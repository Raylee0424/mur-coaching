import { ApiError } from '@/lib/api/client';

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

/** Callers must `unstable_rethrow(err)` first so redirect()/notFound() still work. */
export function toActionError(err: unknown): { ok: false; error: string } {
  if (err instanceof ApiError) return { ok: false, error: err.messages.join(' ') };
  console.error(err);
  return { ok: false, error: 'Something went wrong. Please try again.' };
}
