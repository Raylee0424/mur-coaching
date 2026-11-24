import { SubscriptionStatus } from '@coaching/shared';
import type Stripe from 'stripe';

/** Stripe subscription status to ours. `paused` (trial ended with no card) and `unpaid` lose access. */
export function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
      return SubscriptionStatus.ACTIVE;
    case 'trialing':
      return SubscriptionStatus.TRIALING;
    case 'past_due':
      return SubscriptionStatus.PAST_DUE;
    case 'canceled':
    case 'incomplete_expired':
    case 'unpaid':
      return SubscriptionStatus.CANCELED;
    default:
      return SubscriptionStatus.INCOMPLETE;
  }
}

export const fromUnix = (seconds: number | null | undefined): Date | null => (seconds ? new Date(seconds * 1000) : null);

/** Billing periods live on subscription items; the latest item end is the renewal date. */
export function periodEnd(sub: Pick<Stripe.Subscription, 'items'>): Date | null {
  const ends = sub.items.data.map((i) => i.current_period_end).filter((n): n is number => typeof n === 'number');
  return ends.length > 0 ? fromUnix(Math.max(...ends)) : null;
}

/** Stripe fields that are either an id or an expanded object. */
export const stripeId = (value: string | { id: string } | null | undefined): string | null =>
  value == null ? null : typeof value === 'string' ? value : value.id;
