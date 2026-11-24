import { describe, expect, it } from 'vitest';
import type { EntitlementsDto } from '@coaching/shared';
import { daysLeft, offerBlockReason, orderOffers, parsePriceCents, planStateLine, seatWarning, showCoachCheckout } from './billing';

const base: EntitlementsDto = {
  planId: 'coach', status: 'TRIALING', source: 'TRIAL', features: [], trialEndsAt: null, currentPeriodEnd: null,
  cancelAtPeriodEnd: false, clientLimit: 5, seatsUsed: 2, canManageBilling: false, hasStripeSubscription: false,
};

describe('parsePriceCents', () => {
  it('reads dollars with optional cents, sign and commas', () => {
    expect(parsePriceCents('320')).toBe(32000);
    expect(parsePriceCents('$1,200.5')).toBe(120050);
    expect(parsePriceCents(' 11.99 ')).toBe(1199);
  });

  it('rejects junk, sub-minimum and over-cap amounts', () => {
    expect(parsePriceCents('abc')).toBeNull();
    expect(parsePriceCents('0.4')).toBeNull();
    expect(parsePriceCents('10000.01')).toBeNull();
    expect(parsePriceCents('1.999')).toBeNull();
  });
});

describe('seatWarning', () => {
  it('is quiet with room left and for athletes', () => {
    expect(seatWarning(base)).toBeNull();
    expect(seatWarning({ clientLimit: null, seatsUsed: null })).toBeNull();
  });

  it('warns at, over, and without a plan', () => {
    expect(seatWarning({ clientLimit: 5, seatsUsed: 5 })).toContain('All 5 seats');
    expect(seatWarning({ clientLimit: 5, seatsUsed: 7 })).toContain('Everyone stays visible');
    expect(seatWarning({ clientLimit: 0, seatsUsed: 3 })).toContain('cannot add');
  });
});

describe('planStateLine', () => {
  const now = Date.parse('2026-11-24T00:00:00Z');
  it('counts trial days', () => {
    expect(planStateLine({ ...base, trialEndsAt: '2026-12-01T00:00:00Z' }, now)).toContain('7 days left');
    expect(daysLeft('2026-11-01T00:00:00Z', now)).toBe(0);
  });

  it('explains inherited and lapsed access', () => {
    expect(planStateLine({ ...base, source: 'COACH' })).toContain('included with your coaching');
    expect(planStateLine({ ...base, source: 'NONE' })).toContain('Nothing is deleted');
    expect(planStateLine({ ...base, source: 'SUBSCRIPTION', status: 'PAST_DUE' })).toContain('Payment failed');
  });
});

describe('coach checkout during trial', () => {
  const now = Date.parse('2026-11-24T00:00:00Z');
  const trial = { ...base, trialEndsAt: '2026-12-01T00:00:00Z' };

  it('offers checkout on a card-free trial and says no card is needed', () => {
    expect(showCoachCheckout(trial)).toBe(true);
    expect(planStateLine(trial, now)).toContain('No card needed');
  });

  it('hides checkout and the no-card copy once a Stripe subscription backs the trial', () => {
    const subscribed = { ...trial, hasStripeSubscription: true, canManageBilling: true };
    expect(showCoachCheckout(subscribed)).toBe(false);
    expect(planStateLine(subscribed, now)).not.toContain('No card needed');
    expect(planStateLine(subscribed, now)).toContain('starts billing');
  });

  it('hides checkout for comped plans and shows it for a lapsed coach', () => {
    expect(showCoachCheckout({ ...base, source: 'SUBSCRIPTION' })).toBe(false);
    expect(showCoachCheckout({ ...base, source: 'NONE' })).toBe(true);
  });
});

describe('offerBlockReason', () => {
  const monthly = { id: 'o1', interval: 'MONTH' as const };
  const sub = (status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE') => [{ offerId: 'o1', status }];

  it('blocks only live subscriptions', () => {
    expect(offerBlockReason(monthly, sub('ACTIVE'), true)).toBe('Already subscribed.');
    expect(offerBlockReason(monthly, sub('TRIALING'), true)).toBe('Already subscribed.');
    expect(offerBlockReason(monthly, sub('PAST_DUE'), true)).toContain('past due');
  });

  it('lets an incomplete or cancelled first checkout be retried', () => {
    expect(offerBlockReason(monthly, sub('INCOMPLETE'), true)).toBeNull();
    expect(offerBlockReason(monthly, sub('CANCELED'), true)).toBeNull();
    expect(offerBlockReason({ id: 'o1', interval: 'ONE_TIME' }, sub('ACTIVE'), true)).toBeNull();
  });

  it('blocks everything until the coach can take payments', () => {
    expect(offerBlockReason(monthly, [], false)).toContain('setting up payments');
  });
});

describe('orderOffers', () => {
  const offers = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  it('moves the linked offer first and ignores unknown ids', () => {
    expect(orderOffers(offers, 'c').map((o) => o.id)).toEqual(['c', 'a', 'b']);
    expect(orderOffers(offers, 'zzz').map((o) => o.id)).toEqual(['a', 'b', 'c']);
    expect(orderOffers(offers, undefined).map((o) => o.id)).toEqual(['a', 'b', 'c']);
  });
});
