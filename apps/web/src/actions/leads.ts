'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { LeadStage } from '@coaching/shared';
import type { IntakeQuestion, LeadDto, UpdateLeadRequest } from '@coaching/shared';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { leadsApi } from '@/lib/api/endpoints';
import { formString as field } from '@/lib/form';

const PAGE = '/coach/leads';

/** Wraps an API call into an ActionResult and refreshes the board. */
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

export async function addLead(_prev: ActionResult<LeadDto> | null, formData: FormData): Promise<ActionResult<LeadDto>> {
  const name = field(formData, 'name').trim();
  const email = field(formData, 'email').trim().toLowerCase();
  const phone = field(formData, 'phone').trim();
  const goal = field(formData, 'goal').trim();
  const value = field(formData, 'value').trim();
  if (!name || !email) return { ok: false, error: 'Name and email are required.' };
  const cents = value ? Math.round(Number(value) * 100) : null;
  if (cents !== null && (!Number.isFinite(cents) || cents < 0 || cents > 1_000_000)) return { ok: false, error: 'Enter a monthly value between $0 and $10,000.' };
  return run(() =>
    leadsApi.create({ name, email, ...(phone ? { phone } : {}), ...(goal ? { goal } : {}), ...(cents !== null ? { monthlyValueCents: cents } : {}) }),
  );
}

export async function moveLead(id: string, stage: LeadStage): Promise<ActionResult<LeadDto>> {
  if (!Object.values(LeadStage).includes(stage)) return { ok: false, error: 'Unknown stage.' };
  return run(() => leadsApi.update(id, { stage }));
}

/** Detail sheet form: notes, monthly value and call time. */
export async function saveLeadDetails(_prev: ActionResult<LeadDto> | null, formData: FormData): Promise<ActionResult<LeadDto>> {
  const id = field(formData, 'id');
  const value = field(formData, 'value').trim();
  const callAt = field(formData, 'callAt');
  const cents = value ? Math.round(Number(value) * 100) : null;
  if (cents !== null && (!Number.isFinite(cents) || cents < 0 || cents > 1_000_000)) return { ok: false, error: 'Enter a monthly value between $0 and $10,000.' };
  const body: UpdateLeadRequest = {
    notes: field(formData, 'notes').trim(),
    monthlyValueCents: cents,
    // The datetime-local value is the coach's wall time; the browser sends its UTC instant in `callAtIso`.
    callAt: callAt ? field(formData, 'callAtIso') || null : null,
  };
  return run(() => leadsApi.update(id, body));
}

export async function deleteLead(id: string): Promise<ActionResult> {
  return run(() => leadsApi.remove(id));
}

/** The form editor posts its state as JSON in one hidden field. */
export async function saveIntakeForm(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  let questions: IntakeQuestion[];
  try {
    const parsed: unknown = JSON.parse(field(formData, 'questions') || '[]');
    if (!Array.isArray(parsed)) throw new Error('not an array');
    questions = parsed as IntakeQuestion[];
  } catch {
    return { ok: false, error: 'The question list could not be read. Reload and try again.' };
  }
  const result = await run(() =>
    leadsApi.saveForm({
      slug: field(formData, 'slug').trim().toLowerCase(),
      headline: field(formData, 'headline').trim(),
      intro: field(formData, 'intro').trim(),
      acceptingLeads: field(formData, 'acceptingLeads') === 'on',
      questions,
    }),
  );
  return result.ok ? { ok: true, data: undefined } : result;
}
