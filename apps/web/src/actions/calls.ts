'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type { CreateBookingRequest, SaveAvailabilityRequest, UpdateBookingRequest } from '@coaching/shared';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { callsApi } from '@/lib/api/endpoints';

async function run<T>(page: string, call: () => Promise<T>): Promise<ActionResult> {
  try {
    await call();
    revalidatePath(page);
    return { ok: true, data: undefined };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

const COACH = '/coach/schedule';
const CLIENT = '/client/calls';

export async function saveAvailability(input: SaveAvailabilityRequest): Promise<ActionResult> {
  return run(COACH, () => callsApi.saveAvailability(input));
}

export async function coachBookCall(input: CreateBookingRequest): Promise<ActionResult> {
  return run(COACH, () => callsApi.book(input));
}

export async function coachUpdateBooking(id: string, input: UpdateBookingRequest): Promise<ActionResult> {
  return run(COACH, () => callsApi.update(id, input));
}

export async function coachCancelBooking(id: string): Promise<ActionResult> {
  return run(COACH, () => callsApi.cancel(id));
}

export async function bookCall(input: CreateBookingRequest): Promise<ActionResult> {
  return run(CLIENT, () => callsApi.bookMine(input));
}

export async function moveCall(id: string, startsAt: string): Promise<ActionResult> {
  return run(CLIENT, () => callsApi.moveMine(id, startsAt));
}

export async function cancelCall(id: string): Promise<ActionResult> {
  return run(CLIENT, () => callsApi.cancelMine(id));
}
