import { Feature, PlanId, Role, SubscriptionStatus } from '@coaching/shared';
import type { EntitlementSource } from '@coaching/shared';

export interface PlanFacts {
  id: string;
  role: Role;
  clientLimit: number | null;
  features: Feature[];
}

export interface SubscriptionFacts {
  status: SubscriptionStatus;
  clientLimit: number | null;
  trialEndsAt: Date | null;
  plan: PlanFacts;
}

export interface ResolvedAccess {
  planId: string | null;
  source: EntitlementSource;
  features: Feature[];
  /** Coach seats; null for athletes. */
  clientLimit: number | null;
}

/**
 * Whether a subscription currently grants its plan. PAST_DUE keeps access while Stripe retries the card;
 * Stripe moves it to CANCELED when dunning gives up.
 */
export function grantsAccess(sub: Pick<SubscriptionFacts, 'status' | 'trialEndsAt'>, now: Date): boolean {
  switch (sub.status) {
    case SubscriptionStatus.TRIALING:
      return sub.trialEndsAt === null || sub.trialEndsAt > now;
    case SubscriptionStatus.ACTIVE:
    case SubscriptionStatus.PAST_DUE:
      return true;
    default:
      return false;
  }
}

/**
 * Whether a coach's plan lets their clients inherit Pro: only ACTIVE, or TRIALING with time left. Stricter than
 * the coach's own access on purpose: a PAST_DUE or lapsed coach stops passing Pro on.
 */
export function passesProToClients(sub: { status: SubscriptionStatus; trialEndsAt: Date | null; planRole: Role } | null, now: Date): boolean {
  if (!sub || sub.planRole !== Role.COACH) return false;
  if (sub.status === SubscriptionStatus.ACTIVE) return true;
  return sub.status === SubscriptionStatus.TRIALING && (sub.trialEndsAt === null || sub.trialEndsAt > now);
}

/**
 * Pure entitlement resolution. Losing a plan only removes paid capabilities: nothing here (or anywhere in
 * billing) deletes or hides logged data.
 * - CLIENT: own Pro subscription, else Pro inherited from an accessible coach link whose plan passes it on
 *   (see passesProToClients), else Free.
 * - COACH: coach plan while it grants access, else no paid features and zero seats.
 */
export function resolveAccess(input: {
  role: Role;
  subscription: SubscriptionFacts | null;
  /** Accessible coach link AND passesProToClients(coach's subscription). */
  coachGrantsPro: boolean;
  proPlan: PlanFacts;
  now: Date;
}): ResolvedAccess {
  const { role, subscription: sub, coachGrantsPro, proPlan, now } = input;
  const live = sub !== null && sub.plan.role === role && grantsAccess(sub, now);

  if (role === Role.CLIENT) {
    if (live) return { planId: sub.plan.id, source: 'SUBSCRIPTION', features: [...sub.plan.features], clientLimit: null };
    if (coachGrantsPro) return { planId: proPlan.id, source: 'COACH', features: [...proPlan.features], clientLimit: null };
    return { planId: PlanId.ATHLETE_FREE, source: 'FREE', features: [], clientLimit: null };
  }

  if (live) {
    return {
      planId: sub.plan.id,
      source: sub.status === SubscriptionStatus.TRIALING ? 'TRIAL' : 'SUBSCRIPTION',
      features: [...sub.plan.features],
      clientLimit: sub.clientLimit ?? sub.plan.clientLimit ?? 0,
    };
  }
  return { planId: sub?.plan.id ?? null, source: 'NONE', features: [], clientLimit: 0 };
}

/** 402 copy per feature, pointing at the fix. */
export const UPGRADE_MESSAGES: Partial<Record<Feature, string>> = {
  [Feature.COACH_CLIENTS]: 'Your coach plan is not active. Subscribe on the Billing page to add clients.',
  [Feature.CLIENT_PAYMENTS]: 'Client payments need an active coach plan. Subscribe on the Billing page.',
};

/** Why a coach cannot take another client, or null when a seat is free. */
export type SeatVerdict = { ok: true } | { ok: false; reason: 'NO_PLAN' } | { ok: false; reason: 'FULL'; used: number; limit: number };

export function seatVerdict(access: Pick<ResolvedAccess, 'features' | 'clientLimit'>, used: number): SeatVerdict {
  if (!access.features.includes(Feature.COACH_CLIENTS)) return { ok: false, reason: 'NO_PLAN' };
  const limit = access.clientLimit ?? 0;
  return used >= limit ? { ok: false, reason: 'FULL', used, limit } : { ok: true };
}
