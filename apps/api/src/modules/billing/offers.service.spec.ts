import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { OffersService } from './offers.service';

function setup(opts: { link?: unknown; offer?: unknown; existing?: unknown } = {}) {
  const create = vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.test/s' });
  const prisma = {
    coachClient: {
      findFirst: vi.fn().mockResolvedValue(
        opts.link === undefined ? { coachId: 'c1', coach: { stripeAccountId: 'acct_1', stripeChargesEnabled: true } } : opts.link,
      ),
    },
    coachOffer: {
      findFirst: vi.fn().mockResolvedValue(
        opts.offer === undefined ? { id: 'o1', name: '1:1', description: null, priceCents: 32000, currency: 'usd', interval: 'MONTH' } : opts.offer,
      ),
    },
    clientSubscription: { findFirst: vi.fn().mockResolvedValue(opts.existing ?? null) },
  };
  const stripe = { client: () => ({ checkout: { sessions: { create } } }), webUrl: (p: string) => `http://web${p}`, configured: true };
  const billing = { ensureCustomer: vi.fn().mockResolvedValue('cus_1') };
  const env = { get: () => 10 };
  return { prisma, create, service: new OffersService(prisma as never, stripe as never, billing as never, env as never) };
}

describe('OffersService.checkoutOffer', () => {
  it('scopes the offer to the client own coach', async () => {
    const { service, prisma } = setup();
    await service.checkoutOffer('k1', 'o1');
    expect(prisma.coachOffer.findFirst).toHaveBeenCalledWith({ where: { id: 'o1', coachId: 'c1', archivedAt: null } });
  });

  it('404s for a client with no coach or an offer from another coach', async () => {
    await expect(setup({ link: null }).service.checkoutOffer('k1', 'o1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(setup({ offer: null }).service.checkoutOffer('k1', 'o1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses until the coach finishes Stripe onboarding', async () => {
    const link = { coachId: 'c1', coach: { stripeAccountId: 'acct_1', stripeChargesEnabled: false } };
    await expect(setup({ link }).service.checkoutOffer('k1', 'o1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses a second live subscription to the same offer', async () => {
    await expect(setup({ existing: { id: 'cs1' } }).service.checkoutOffer('k1', 'o1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('builds a destination-charge subscription with the platform fee and offer metadata', async () => {
    const { service, create } = setup();
    expect(await service.checkoutOffer('k1', 'o1')).toEqual({ url: 'https://checkout.stripe.test/s' });
    const args = create.mock.calls[0]?.[0];
    expect(args.mode).toBe('subscription');
    expect(args.subscription_data).toMatchObject({
      transfer_data: { destination: 'acct_1' },
      application_fee_percent: 10,
      metadata: { kind: 'offer', offerId: 'o1', coachId: 'c1', clientId: 'k1' },
    });
    expect(args.line_items[0].price_data).toMatchObject({ unit_amount: 32000, recurring: { interval: 'month' } });
  });

  it('uses a one-time payment with a fixed fee amount for ONE_TIME offers', async () => {
    const offer = { id: 'o2', name: 'Meet day', description: 'x', priceCents: 15000, currency: 'usd', interval: 'ONE_TIME' };
    const { service, create } = setup({ offer });
    await service.checkoutOffer('k1', 'o2');
    const args = create.mock.calls[0]?.[0];
    expect(args.mode).toBe('payment');
    expect(args.payment_intent_data).toMatchObject({ transfer_data: { destination: 'acct_1' }, application_fee_amount: 1500 });
  });
});

describe('OffersService.coachBilling Connect refresh', () => {
  function overview(stored: boolean, live: boolean) {
    const update = vi.fn().mockResolvedValue({});
    const prisma = {
      user: { findUniqueOrThrow: vi.fn().mockResolvedValue({ stripeAccountId: 'acct_1', stripeChargesEnabled: stored }), update },
      coachOffer: { findMany: vi.fn().mockResolvedValue([]) },
      clientSubscription: { findMany: vi.fn().mockResolvedValue([]) },
      payment: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const stripe = { configured: true, client: () => ({ accounts: { retrieve: vi.fn().mockResolvedValue({ charges_enabled: live }) } }) };
    return { update, service: new OffersService(prisma as never, stripe as never, {} as never, { get: () => 0 } as never) };
  }

  it('switches charges off when Stripe disabled the account', async () => {
    const { service, update } = overview(true, false);
    expect((await service.coachBilling('c1')).connect.chargesEnabled).toBe(false);
    expect(update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { stripeChargesEnabled: false } });
  });

  it('switches charges on when Stripe enabled the account', async () => {
    const { service, update } = overview(false, true);
    expect((await service.coachBilling('c1')).connect.chargesEnabled).toBe(true);
    expect(update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { stripeChargesEnabled: true } });
  });

  it('writes nothing when the stored flag already matches', async () => {
    const { service, update } = overview(true, true);
    await service.coachBilling('c1');
    expect(update).not.toHaveBeenCalled();
  });
});
