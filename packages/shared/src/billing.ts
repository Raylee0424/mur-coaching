import type { IsoDateString } from './common';
import type { Role } from './enums';

// String-literal enums mirror the Prisma enums of the same name.

/** Paid capabilities a plan can grant. Free core features (logging, history, custom exercises) carry no key. */
export const Feature = {
  AI_COACH: 'AI_COACH',
  AI_WORKOUT_GENERATOR: 'AI_WORKOUT_GENERATOR',
  VOICE_LOGGING: 'VOICE_LOGGING',
  PROGRAM_CREATION: 'PROGRAM_CREATION',
  PERSONAL_RECORDS: 'PERSONAL_RECORDS',
  EXERCISE_STATS: 'EXERCISE_STATS',
  MUSCLE_ANALYTICS: 'MUSCLE_ANALYTICS',
  AI_FOOD_PHOTOS: 'AI_FOOD_PHOTOS',
  /** Add clients (invite or create). Seats are capped by the subscription's client limit. */
  COACH_CLIENTS: 'COACH_CLIENTS',
  /** Connect Stripe and sell offers to clients. */
  CLIENT_PAYMENTS: 'CLIENT_PAYMENTS',
} as const;
export type Feature = (typeof Feature)[keyof typeof Feature];

export const PlanId = {
  ATHLETE_FREE: 'athlete-free',
  ATHLETE_PRO: 'athlete-pro',
  COACH: 'coach',
} as const;
export type PlanId = (typeof PlanId)[keyof typeof PlanId];

export const SubscriptionStatus = {
  TRIALING: 'TRIALING',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELED: 'CANCELED',
  INCOMPLETE: 'INCOMPLETE',
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const OfferInterval = { ONE_TIME: 'ONE_TIME', MONTH: 'MONTH' } as const;
export type OfferInterval = (typeof OfferInterval)[keyof typeof OfferInterval];

export const PaymentStatus = { SUCCEEDED: 'SUCCEEDED', FAILED: 'FAILED', REFUNDED: 'REFUNDED' } as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export interface PlanDefinition {
  id: PlanId;
  name: string;
  role: Role;
  /** Monthly price in cents (USD). */
  priceCents: number;
  trialDays: number;
  /** Coach seats included; null for athlete plans. */
  clientLimit: number | null;
  features: readonly Feature[];
  /** Marketing bullets for the pricing cards. */
  highlights: readonly string[];
  summary: string;
}

const PRO_FEATURES: readonly Feature[] = [
  Feature.AI_COACH,
  Feature.AI_WORKOUT_GENERATOR,
  Feature.VOICE_LOGGING,
  Feature.PROGRAM_CREATION,
  Feature.PERSONAL_RECORDS,
  Feature.EXERCISE_STATS,
  Feature.MUSCLE_ANALYTICS,
  Feature.AI_FOOD_PHOTOS,
];

/**
 * Plan catalog. The `Plan` and `Entitlement` tables mirror it (migration inserts, seed upserts),
 * so the public pricing page can render without an API call.
 */
export const PLANS: readonly PlanDefinition[] = [
  {
    id: PlanId.ATHLETE_FREE,
    name: 'Athletes Free',
    role: 'CLIENT',
    priceCents: 0,
    trialDays: 0,
    clientLimit: null,
    features: [],
    summary: 'Everything you need to log training and keep your history. No ads.',
    highlights: ['Core workout logging and custom exercises', 'Full training history and lift detail', 'Calculators and templates', 'Your data stays yours on every plan'],
  },
  {
    id: PlanId.ATHLETE_PRO,
    name: 'Athletes Pro',
    role: 'CLIENT',
    priceCents: 1199,
    trialDays: 0,
    clientLimit: null,
    features: PRO_FEATURES,
    summary: 'Pro extras for automated progression, AI coaching and muscle analytics.',
    highlights: ['MUR AI Training Coach and AI Workout Generator', 'Voice logging and AI food photo analysis', 'Program creation and PR tracking', 'Exercise stats and 2D muscle analytics'],
  },
  {
    id: PlanId.COACH,
    name: 'Coaches',
    role: 'COACH',
    priceCents: 1999,
    trialDays: 14,
    clientLimit: 5,
    features: [Feature.COACH_CLIENTS, Feature.CLIENT_PAYMENTS],
    summary: 'Up to 5 clients. 14-day free trial, no card required.',
    highlights: ['1–52 week program builder and progression queue', 'Session reviews and client calendars', 'Stripe client payments', 'Client limit warnings, never data loss'],
  },
];

export const planById = (id: string): PlanDefinition | undefined => PLANS.find((p) => p.id === id);

/** Where the current access comes from. COACH = a coached client inherits Pro from their coach. */
export type EntitlementSource = 'SUBSCRIPTION' | 'TRIAL' | 'COACH' | 'FREE' | 'NONE';

export interface EntitlementsDto {
  planId: PlanId | null;
  status: SubscriptionStatus | null;
  source: EntitlementSource;
  features: Feature[];
  trialEndsAt: IsoDateString | null;
  currentPeriodEnd: IsoDateString | null;
  cancelAtPeriodEnd: boolean;
  /** Coach only: seats allowed, null for athletes. 0 when the coach has no active plan. */
  clientLimit: number | null;
  /** Coach only: ACTIVE and PAUSED clients plus unexpired pending invites. */
  seatsUsed: number | null;
  /** True when a Stripe customer exists, so the billing portal can open. */
  canManageBilling: boolean;
  /** A Stripe subscription backs the current plan (it may still be in its trial): no checkout, use the portal. */
  hasStripeSubscription: boolean;
}

export interface CheckoutRequest {
  planId: PlanId;
}

export interface RedirectUrlDto {
  url: string;
}

export interface CoachOfferDto {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  interval: OfferInterval;
  archived: boolean;
  activeCount: number;
  createdAt: IsoDateString;
}

export interface CreateCoachOfferRequest {
  name: string;
  description?: string;
  priceCents: number;
  interval: OfferInterval;
}

export interface ClientSubscriptionDto {
  id: string;
  offerId: string;
  offerName: string;
  clientId: string;
  clientName: string;
  amountCents: number;
  currency: string;
  status: SubscriptionStatus;
  currentPeriodEnd: IsoDateString | null;
  cancelAtPeriodEnd: boolean;
}

export interface PaymentDto {
  id: string;
  clientName: string;
  offerName: string | null;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  paidAt: IsoDateString;
}

export interface CoachBillingDto {
  connect: { connected: boolean; chargesEnabled: boolean };
  /** False when the API has no Stripe key; the UI disables Stripe actions. */
  stripeConfigured: boolean;
  stats: { mrrCents: number; activeCount: number; pastDueCount: number };
  offers: CoachOfferDto[];
  subscriptions: ClientSubscriptionDto[];
  payments: PaymentDto[];
}

export interface ClientOffersDto {
  coachName: string | null;
  /** False until the coach finishes Stripe onboarding. */
  purchasable: boolean;
  offers: CoachOfferDto[];
  subscriptions: ClientSubscriptionDto[];
}

/** "$11.99" style. Whole amounts drop the cents ("$320"). */
export function formatMoney(cents: number, currency = 'usd'): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
