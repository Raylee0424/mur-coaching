import { describe, expect, it } from 'vitest';
import { SubscriptionStatus } from '@coaching/shared';
import { fromUnix, mapStripeStatus, periodEnd, stripeId } from './stripe-sync';

describe('stripe-sync', () => {
  it('maps every Stripe status onto ours', () => {
    expect(mapStripeStatus('active')).toBe(SubscriptionStatus.ACTIVE);
    expect(mapStripeStatus('trialing')).toBe(SubscriptionStatus.TRIALING);
    expect(mapStripeStatus('past_due')).toBe(SubscriptionStatus.PAST_DUE);
    expect(mapStripeStatus('unpaid')).toBe(SubscriptionStatus.CANCELED);
    expect(mapStripeStatus('canceled')).toBe(SubscriptionStatus.CANCELED);
    expect(mapStripeStatus('incomplete_expired')).toBe(SubscriptionStatus.CANCELED);
    expect(mapStripeStatus('incomplete')).toBe(SubscriptionStatus.INCOMPLETE);
    expect(mapStripeStatus('paused')).toBe(SubscriptionStatus.INCOMPLETE);
  });

  it('reads the latest item period end', () => {
    const items = { data: [{ current_period_end: 1_700_000_000 }, { current_period_end: 1_800_000_000 }] };
    expect(periodEnd({ items } as never)).toEqual(new Date(1_800_000_000_000));
    expect(periodEnd({ items: { data: [] } } as never)).toBeNull();
  });

  it('normalizes ids and timestamps', () => {
    expect(stripeId('cus_1')).toBe('cus_1');
    expect(stripeId({ id: 'cus_2' })).toBe('cus_2');
    expect(stripeId(null)).toBeNull();
    expect(fromUnix(null)).toBeNull();
    expect(fromUnix(1)).toEqual(new Date(1000));
  });
});
