import { describe, expect, it } from 'vitest';
import { Feature, Role, SubscriptionStatus } from '@coaching/shared';
import { grantsAccess, passesProToClients, resolveAccess, seatVerdict, type PlanFacts, type SubscriptionFacts } from './entitlements';

const now = new Date('2026-11-24T12:00:00Z');
const later = new Date('2026-12-01T00:00:00Z');
const earlier = new Date('2026-11-01T00:00:00Z');
const pro: PlanFacts = { id: 'athlete-pro', role: Role.CLIENT, clientLimit: null, features: [Feature.AI_COACH, Feature.PERSONAL_RECORDS] };
const coach: PlanFacts = { id: 'coach', role: Role.COACH, clientLimit: 5, features: [Feature.COACH_CLIENTS, Feature.CLIENT_PAYMENTS] };
const sub = (plan: PlanFacts, status: SubscriptionStatus, extra: Partial<SubscriptionFacts> = {}): SubscriptionFacts => ({
  plan, status, clientLimit: null, trialEndsAt: null, ...extra,
});

describe('grantsAccess', () => {
  it('keeps access while active or past due, and while a trial runs', () => {
    expect(grantsAccess({ status: SubscriptionStatus.ACTIVE, trialEndsAt: null }, now)).toBe(true);
    expect(grantsAccess({ status: SubscriptionStatus.PAST_DUE, trialEndsAt: null }, now)).toBe(true);
    expect(grantsAccess({ status: SubscriptionStatus.TRIALING, trialEndsAt: later }, now)).toBe(true);
  });

  it('ends access for an expired trial, a cancellation or an incomplete checkout', () => {
    expect(grantsAccess({ status: SubscriptionStatus.TRIALING, trialEndsAt: earlier }, now)).toBe(false);
    expect(grantsAccess({ status: SubscriptionStatus.CANCELED, trialEndsAt: null }, now)).toBe(false);
    expect(grantsAccess({ status: SubscriptionStatus.INCOMPLETE, trialEndsAt: null }, now)).toBe(false);
  });
});

describe('resolveAccess', () => {
  it('gives a solo athlete the free plan with no paid features', () => {
    expect(resolveAccess({ role: Role.CLIENT, subscription: null, coachGrantsPro: false, proPlan: pro, now })).toEqual({
      planId: 'athlete-free', source: 'FREE', features: [], clientLimit: null,
    });
  });

  it('lets a coached client inherit Pro from the coach', () => {
    const r = resolveAccess({ role: Role.CLIENT, subscription: null, coachGrantsPro: true, proPlan: pro, now });
    expect(r.source).toBe('COACH');
    expect(r.features).toEqual(pro.features);
  });

  it('prefers the athlete own live Pro subscription', () => {
    const r = resolveAccess({ role: Role.CLIENT, subscription: sub(pro, SubscriptionStatus.ACTIVE), coachGrantsPro: true, proPlan: pro, now });
    expect(r.source).toBe('SUBSCRIPTION');
  });

  it('drops a cancelled athlete back to free features', () => {
    const r = resolveAccess({ role: Role.CLIENT, subscription: sub(pro, SubscriptionStatus.CANCELED), coachGrantsPro: false, proPlan: pro, now });
    expect(r).toMatchObject({ source: 'FREE', features: [] });
  });

  it('gives a trialing coach the plan seats, or the grandfathered override', () => {
    const trial = resolveAccess({ role: Role.COACH, subscription: sub(coach, SubscriptionStatus.TRIALING, { trialEndsAt: later }), coachGrantsPro: false, proPlan: pro, now });
    expect(trial).toMatchObject({ source: 'TRIAL', clientLimit: 5, features: coach.features });
    const grandfathered = resolveAccess({ role: Role.COACH, subscription: sub(coach, SubscriptionStatus.ACTIVE, { clientLimit: 9 }), coachGrantsPro: false, proPlan: pro, now });
    expect(grandfathered).toMatchObject({ source: 'SUBSCRIPTION', clientLimit: 9 });
  });

  it('leaves a lapsed coach with zero seats and no paid features', () => {
    const r = resolveAccess({ role: Role.COACH, subscription: sub(coach, SubscriptionStatus.TRIALING, { trialEndsAt: earlier }), coachGrantsPro: false, proPlan: pro, now });
    expect(r).toEqual({ planId: 'coach', source: 'NONE', features: [], clientLimit: 0 });
  });

  it('ignores a subscription to a plan for the other role', () => {
    const r = resolveAccess({ role: Role.COACH, subscription: sub(pro, SubscriptionStatus.ACTIVE), coachGrantsPro: false, proPlan: pro, now });
    expect(r.source).toBe('NONE');
  });
});

describe('passesProToClients', () => {
  it('passes Pro on only while the coach plan is ACTIVE or an unexpired trial', () => {
    expect(passesProToClients({ status: SubscriptionStatus.ACTIVE, trialEndsAt: null, planRole: Role.COACH }, now)).toBe(true);
    expect(passesProToClients({ status: SubscriptionStatus.TRIALING, trialEndsAt: later, planRole: Role.COACH }, now)).toBe(true);
  });

  it('stops for an expired trial, past due, cancelled, missing plan, or a non-coach plan', () => {
    expect(passesProToClients({ status: SubscriptionStatus.TRIALING, trialEndsAt: earlier, planRole: Role.COACH }, now)).toBe(false);
    expect(passesProToClients({ status: SubscriptionStatus.PAST_DUE, trialEndsAt: null, planRole: Role.COACH }, now)).toBe(false);
    expect(passesProToClients({ status: SubscriptionStatus.CANCELED, trialEndsAt: null, planRole: Role.COACH }, now)).toBe(false);
    expect(passesProToClients(null, now)).toBe(false);
    expect(passesProToClients({ status: SubscriptionStatus.ACTIVE, trialEndsAt: null, planRole: Role.CLIENT }, now)).toBe(false);
  });

  it('a coached client of a lapsed coach is Free, unless they pay for Pro themselves', () => {
    expect(resolveAccess({ role: Role.CLIENT, subscription: null, coachGrantsPro: false, proPlan: pro, now })).toMatchObject({ source: 'FREE', features: [] });
    expect(resolveAccess({ role: Role.CLIENT, subscription: sub(pro, SubscriptionStatus.ACTIVE), coachGrantsPro: false, proPlan: pro, now }).source).toBe('SUBSCRIPTION');
  });
});

describe('seatVerdict', () => {
  const coachAccess = { features: [Feature.COACH_CLIENTS], clientLimit: 5 };
  it('reports a free seat, a full roster, or no plan', () => {
    expect(seatVerdict(coachAccess, 4)).toEqual({ ok: true });
    expect(seatVerdict(coachAccess, 5)).toEqual({ ok: false, reason: 'FULL', used: 5, limit: 5 });
    expect(seatVerdict({ features: [], clientLimit: 0 }, 0)).toEqual({ ok: false, reason: 'NO_PLAN' });
  });
});
