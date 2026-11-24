import { OfferInterval, SubscriptionStatus, type ClientSubscriptionDto, type CoachOfferDto, type EntitlementsDto } from '@coaching/shared';
import type { BadgeTone } from '@/components/ui/Badge';

/** "320" or "320.50" or "$1,200" to cents; null for anything else. Stripe minimum is $0.50, cap $10,000. */
export function parsePriceCents(input: string): number | null {
  const cleaned = input.trim().replace(/^\$/, '').replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  return cents >= 50 && cents <= 1_000_000 ? cents : null;
}

export const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  TRIALING: 'Trial',
  ACTIVE: 'Active',
  PAST_DUE: 'Past due',
  CANCELED: 'Cancelled',
  INCOMPLETE: 'Pending',
};

export const STATUS_TONE: Record<SubscriptionStatus, BadgeTone> = {
  TRIALING: 'sky',
  ACTIVE: 'emerald',
  PAST_DUE: 'amber',
  CANCELED: 'slate',
  INCOMPLETE: 'slate',
};

/** Whole days left until `iso` (never negative). */
export function daysLeft(iso: string, nowMs: number = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - nowMs) / 86_400_000));
}

/** Coach seat warning: null when there is room. Over the limit never hides clients, it only blocks adding. */
export function seatWarning(e: Pick<EntitlementsDto, 'clientLimit' | 'seatsUsed'>): string | null {
  if (e.clientLimit === null || e.seatsUsed === null) return null;
  if (e.clientLimit === 0) return 'No active plan: you can see every client, but cannot add new ones until you subscribe.';
  if (e.seatsUsed > e.clientLimit) return `${e.seatsUsed} of ${e.clientLimit} seats in use. Everyone stays visible; free a seat before adding clients.`;
  if (e.seatsUsed === e.clientLimit) return `All ${e.clientLimit} seats in use. Archive a client or revoke an invite to add someone new.`;
  return null;
}

/** One-line plan state for the billing header. */
export function planStateLine(e: EntitlementsDto, nowMs: number = Date.now()): string {
  if (e.source === 'TRIAL' && e.trialEndsAt) {
    const days = daysLeft(e.trialEndsAt, nowMs);
    return e.hasStripeSubscription
      ? `Free trial: ${days} days left. Your subscription starts billing when it ends.`
      : `Free trial: ${days} days left. No card needed until it ends.`;
  }
  if (e.source === 'COACH') return 'Pro features are included with your coaching.';
  if (e.source === 'FREE') return 'Free plan. Your logs and history are always kept.';
  if (e.source === 'NONE') return 'No active plan. Nothing is deleted; subscribe to add clients again.';
  if (e.status === SubscriptionStatus.PAST_DUE) return 'Payment failed. Stripe is retrying; update your card in the billing portal.';
  if (e.cancelAtPeriodEnd && e.currentPeriodEnd) return `Cancels at period end. Data is kept after it ends.`;
  return 'Subscription active.';
}

/**
 * Whether the coach page offers checkout. Hidden once a Stripe subscription backs the plan (even mid-trial: the
 * portal manages it) and for comped plans; shown for a card-free trial or a lapsed plan.
 */
export function showCoachCheckout(e: Pick<EntitlementsDto, 'hasStripeSubscription' | 'source'>): boolean {
  return !e.hasStripeSubscription && e.source !== 'SUBSCRIPTION';
}

/** Why a client cannot buy this offer right now, or null. Matches the API: only live subscriptions block. */
export function offerBlockReason(offer: Pick<CoachOfferDto, 'id' | 'interval'>, subs: readonly Pick<ClientSubscriptionDto, 'offerId' | 'status'>[], purchasable: boolean): string | null {
  if (!purchasable) return 'Your coach is still setting up payments.';
  if (offer.interval !== OfferInterval.MONTH) return null;
  const statuses = subs.filter((s) => s.offerId === offer.id).map((s) => s.status);
  if (statuses.some((st) => st === SubscriptionStatus.ACTIVE || st === SubscriptionStatus.TRIALING)) return 'Already subscribed.';
  if (statuses.includes(SubscriptionStatus.PAST_DUE)) return 'Payment past due. Update your card in the billing portal.';
  return null; // none, cancelled, or an incomplete first checkout: retry allowed
}

/** The offer from a coach's copied link (`?offer=id`) goes first; unknown ids change nothing. */
export function orderOffers<T extends { id: string }>(offers: readonly T[], selectedId: string | undefined): T[] {
  const picked = selectedId ? offers.find((o) => o.id === selectedId) : undefined;
  return picked ? [picked, ...offers.filter((o) => o !== picked)] : [...offers];
}
