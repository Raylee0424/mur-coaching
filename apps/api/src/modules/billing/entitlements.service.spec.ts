import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EntitlementsService } from './entitlements.service';

const plan = (id: string, role: string, features: string[], clientLimit: number | null = null) => ({
  id, role, clientLimit, entitlements: features.map((feature) => ({ feature })),
});
const coachPlan = plan('coach', 'COACH', ['COACH_CLIENTS', 'CLIENT_PAYMENTS'], 5);

function setup(opts: {
  status?: string;
  trialEndsAt?: Date | null;
  clients?: number;
  invites?: number;
  noSub?: boolean;
  stripeSubscriptionId?: string | null;
  user?: Record<string, unknown>;
}) {
  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue(
        opts.user ?? {
          role: 'COACH',
          stripeCustomerId: null,
          coachLink: null,
          subscription: opts.noSub
            ? null
            : {
                status: opts.status ?? 'ACTIVE',
                clientLimit: null,
                trialEndsAt: opts.trialEndsAt ?? null,
                plan: coachPlan,
                currentPeriodEnd: null,
                cancelAtPeriodEnd: false,
                stripeSubscriptionId: opts.stripeSubscriptionId ?? null,
              },
        },
      ),
    },
    plan: { findUniqueOrThrow: vi.fn().mockResolvedValue(plan('athlete-pro', 'CLIENT', ['AI_COACH'])) },
    coachClient: { count: vi.fn().mockResolvedValue(opts.clients ?? 0) },
    invite: { count: vi.fn().mockResolvedValue(opts.invites ?? 0) },
  };
  return { prisma, service: new EntitlementsService(prisma as never) };
}

describe('EntitlementsService.assertSeat', () => {
  it('allows adding a client below the limit', async () => {
    await expect(setup({ clients: 3, invites: 1 }).service.assertSeat('c1')).resolves.toBeUndefined();
  });

  it('answers 402 when active clients plus pending invites fill every seat', async () => {
    const err = await setup({ clients: 4, invites: 1 }).service.assertSeat('c1').catch((e) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(402);
    expect(err.message).toContain('5 of 5');
  });

  it('answers 402 for a coach whose trial ended', async () => {
    const err = await setup({ status: 'TRIALING', trialEndsAt: new Date('2020-01-01') }).service.assertSeat('c1').catch((e) => e);
    expect(err.getStatus()).toBe(402);
    expect(err.message).toContain('not active');
  });

  it('does not count the invite being replaced', async () => {
    const { service, prisma } = setup({ clients: 1 });
    await service.assertSeat('c1', 'a@b.co');
    expect(prisma.invite.count.mock.calls[0]?.[0].where.NOT).toEqual({ email: 'a@b.co' });
  });
});

describe('EntitlementsService.forUser', () => {
  it('reports seats and limit for a coach', async () => {
    const dto = await setup({ clients: 6 }).service.forUser('c1');
    expect(dto).toMatchObject({ source: 'SUBSCRIPTION', clientLimit: 5, seatsUsed: 6, canManageBilling: false });
  });

  it('reports no plan for a coach without a subscription', async () => {
    const dto = await setup({ noSub: true }).service.forUser('c1');
    expect(dto).toMatchObject({ planId: null, source: 'NONE', clientLimit: 0, features: [] });
  });
});

describe('EntitlementsService seats', () => {
  it('counts ACTIVE and PAUSED clients; only ARCHIVED frees a seat', async () => {
    const { service, prisma } = setup({ clients: 2 });
    await service.seatsUsed('c1');
    expect(prisma.coachClient.count.mock.calls[0]?.[0].where).toEqual({ coachId: 'c1', status: { in: ['ACTIVE', 'PAUSED'] } });
  });
});

describe('EntitlementsService coach inheritance', () => {
  const client = (coachSub: unknown, linkStatus = 'ACTIVE') => ({
    role: 'CLIENT',
    stripeCustomerId: null,
    subscription: null,
    coachLink: { status: linkStatus, coach: { subscription: coachSub } },
  });

  it('gives a coached client Pro while the coach is active', async () => {
    const dto = await setup({ user: client({ status: 'ACTIVE', trialEndsAt: null, plan: { role: 'COACH' } }) }).service.forUser('k1');
    expect(dto).toMatchObject({ source: 'COACH', features: ['AI_COACH'] });
  });

  it('drops the client to Free when the coach trial lapsed, the coach is past due, or the link is archived', async () => {
    for (const user of [
      client({ status: 'TRIALING', trialEndsAt: new Date('2020-01-01'), plan: { role: 'COACH' } }),
      client({ status: 'PAST_DUE', trialEndsAt: null, plan: { role: 'COACH' } }),
      client(null),
      client({ status: 'ACTIVE', trialEndsAt: null, plan: { role: 'COACH' } }, 'ARCHIVED'),
    ]) {
      expect(await setup({ user }).service.forUser('k1')).toMatchObject({ source: 'FREE', features: [] });
    }
  });
});

describe('EntitlementsService.forUser hasStripeSubscription', () => {
  it('is true for a Stripe-backed trial, false for a local trial or a cancelled Stripe sub', async () => {
    const later = new Date(Date.now() + 5 * 86_400_000);
    expect((await setup({ status: 'TRIALING', trialEndsAt: later, stripeSubscriptionId: 'sub_1' }).service.forUser('c1')).hasStripeSubscription).toBe(true);
    expect((await setup({ status: 'TRIALING', trialEndsAt: later }).service.forUser('c1')).hasStripeSubscription).toBe(false);
    expect((await setup({ status: 'CANCELED', stripeSubscriptionId: 'sub_1' }).service.forUser('c1')).hasStripeSubscription).toBe(false);
  });
});

describe('EntitlementsService.seatFor', () => {
  it('excludes the invite being accepted from the count', async () => {
    const { service, prisma } = setup({ clients: 4, invites: 0 });
    expect(await service.seatFor('c1', 'new@x.co')).toEqual({ ok: true });
    expect(prisma.invite.count.mock.calls[0]?.[0].where.NOT).toEqual({ email: 'new@x.co' });
  });
});
