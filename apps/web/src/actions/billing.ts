'use server';

import { revalidatePath } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { OfferInterval, PlanId } from '@coaching/shared';
import type { RedirectUrlDto } from '@coaching/shared';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { billingApi } from '@/lib/api/endpoints';
import { parsePriceCents } from '@/lib/billing';
import { formString as field } from '@/lib/form';

/** Every Stripe hop works the same way: the API returns a hosted URL, the browser goes there. */
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

export async function startCheckout(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const planId = field(formData, 'planId');
  if (planId !== PlanId.ATHLETE_PRO && planId !== PlanId.COACH) return { ok: false, error: 'Unknown plan.' };
  return goTo(() => billingApi.checkout({ planId }));
}

export async function openBillingPortal(): Promise<ActionResult> {
  return goTo(() => billingApi.portal());
}

export async function connectStripe(): Promise<ActionResult> {
  return goTo(() => billingApi.connect());
}

export async function openStripeDashboard(): Promise<ActionResult> {
  return goTo(() => billingApi.dashboard());
}

export async function checkoutOffer(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const offerId = field(formData, 'offerId');
  if (!offerId) return { ok: false, error: 'Unknown offer.' };
  return goTo(() => billingApi.checkoutOffer(offerId));
}

export async function createOffer(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const name = field(formData, 'name').trim();
  const description = field(formData, 'description').trim();
  const priceCents = parsePriceCents(field(formData, 'price'));
  const interval = field(formData, 'interval');
  if (!name) return { ok: false, error: 'Name the offer.' };
  if (priceCents === null) return { ok: false, error: 'Enter a price between $0.50 and $10,000.' };
  if (interval !== OfferInterval.MONTH && interval !== OfferInterval.ONE_TIME) return { ok: false, error: 'Choose monthly or one-time.' };
  try {
    await billingApi.createOffer({ name, priceCents, interval, ...(description ? { description } : {}) });
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
  revalidatePath('/coach/billing');
  return { ok: true, data: undefined };
}

export async function archiveOffer(offerId: string): Promise<ActionResult> {
  try {
    await billingApi.archiveOffer(offerId);
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
  revalidatePath('/coach/billing');
  return { ok: true, data: undefined };
}
