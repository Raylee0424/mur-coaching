import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { WebhookService } from './webhook.service';

const stripeSub = (over: Record<string, unknown> = {}) => ({
  id: 'sub_1',
  status: 'active',
  trial_end: null,
  cancel_at_period_end: false,
  customer: 'cus_1',
  metadata: { kind: 'platform', userId: 'u1', planId: 'athlete-pro' },
  items: { data: [{ current_period_end: 1_800_000_000, price: { unit_amount: 1199, currency: 'usd' } }] },
  ...over,
});

function setup(opts: { seen?: { processedAt: Date | null } | null; user?: unknown; sub?: ReturnType<typeof stripeSub>; connectSecret?: boolean } = {}) {
  const retrieve = vi.fn().mockResolvedValue(opts.sub ?? stripeSub());
  const constructEvent = vi.fn();
  const prisma = {
    stripeEvent: {
      findUnique: vi.fn().mockResolvedValue(opts.seen ?? null),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(opts.user === undefined ? { id: 'u1', role: 'CLIENT', stripeCustomerId: null, subscription: null } : opts.user),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    subscription: { upsert: vi.fn().mockReturnValue('sub-upsert') },
    billingEvent: { createMany: vi.fn().mockReturnValue('event-create') },
    coachOffer: { findFirst: vi.fn().mockResolvedValue({ id: 'o1' }) },
    clientSubscription: { upsert: vi.fn().mockResolvedValue({}), findUnique: vi.fn().mockResolvedValue({ id: 'cs1' }) },
    payment: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
    },
    workoutLog: { deleteMany: vi.fn() },
    $transaction: vi.fn().mockResolvedValue([]),
  };
  const webhookSecret = vi.fn((endpoint: string) => {
    if (endpoint === 'connect' && opts.connectSecret === false) throw new ServiceUnavailableException('Payments are not configured');
    return endpoint === 'connect' ? 'whsec_connect' : 'whsec_platform';
  });
  const stripe = { webhookSecret, client: () => ({ subscriptions: { retrieve }, webhooks: { constructEvent } }) };
  return { prisma, retrieve, constructEvent, webhookSecret, service: new WebhookService(prisma as never, stripe as never) };
}

const subEvent = (type = 'customer.subscription.updated') => ({ id: 'evt_1', type, data: { object: { id: 'sub_1' } } }) as never;
const offerMeta = { kind: 'offer', offerId: 'o1', coachId: 'c1', clientId: 'k1' };
const invoiceEvent = (type: 'invoice.paid' | 'invoice.payment_failed', id = 'evt_inv') =>
  ({
    id,
    type,
    data: {
      object: {
        id: 'in_1',
        amount_paid: type === 'invoice.paid' ? 32000 : 0,
        amount_due: 32000,
        currency: 'usd',
        status_transitions: { paid_at: type === 'invoice.paid' ? 1_800_000_000 : null },
        parent: { subscription_details: { subscription: 'sub_9', metadata: offerMeta } },
      },
    },
  }) as never;

describe('WebhookService.receive', () => {
  it('rejects a missing or invalid signature before touching the database', async () => {
    const { service, constructEvent, prisma } = setup();
    await expect(service.receive(Buffer.from('{}'), undefined)).rejects.toBeInstanceOf(BadRequestException);
    constructEvent.mockImplementation(() => {
      throw new Error('bad sig');
    });
    await expect(service.receive(Buffer.from('{}'), 't=1,v1=x')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.stripeEvent.findUnique).not.toHaveBeenCalled();
  });

  it('verifies Connect deliveries with the Connect secret', async () => {
    const { service, constructEvent } = setup();
    constructEvent.mockReturnValue({ id: 'evt_c', type: 'account.updated', data: { object: { id: 'acct_1', charges_enabled: false } } });
    await service.receive(Buffer.from('{}'), 'sig', 'connect');
    expect(constructEvent).toHaveBeenCalledWith(expect.anything(), 'sig', 'whsec_connect');
  });

  it('answers 503 on the Connect endpoint when its secret is unset', async () => {
    const { service } = setup({ connectSecret: false });
    await expect(service.receive(Buffer.from('{}'), 'sig', 'connect')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

describe('WebhookService.process', () => {
  it('skips an event that was already processed', async () => {
    const { service, retrieve, prisma } = setup({ seen: { processedAt: new Date() } });
    await service.process(subEvent());
    expect(retrieve).not.toHaveBeenCalled();
    expect(prisma.stripeEvent.create).not.toHaveBeenCalled();
  });

  it('mirrors a platform subscription re-read from Stripe and marks the event processed', async () => {
    const { service, prisma, retrieve } = setup();
    await service.process(subEvent());
    expect(retrieve).toHaveBeenCalledWith('sub_1');
    const upsert = prisma.subscription.upsert.mock.calls[0]?.[0];
    expect(upsert.where).toEqual({ userId: 'u1' });
    expect(upsert.update).toMatchObject({ planId: 'athlete-pro', status: 'ACTIVE', stripeSubscriptionId: 'sub_1', currentPeriodEnd: new Date(1_800_000_000_000) });
    expect(upsert.update).not.toHaveProperty('clientLimit');
    expect(prisma.stripeEvent.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ error: null }) }));
  });

  it('records a cancellation as status only and never deletes data', async () => {
    const { service, prisma } = setup({ sub: stripeSub({ status: 'canceled' }) });
    await service.process(subEvent('customer.subscription.deleted'));
    expect(prisma.subscription.upsert.mock.calls[0]?.[0].update.status).toBe('CANCELED');
    expect(prisma.billingEvent.createMany.mock.calls[0]?.[0].data.type).toBe('SUBSCRIPTION_CANCELED');
    expect(prisma.workoutLog.deleteMany).not.toHaveBeenCalled();
  });

  it('does not let an old cancelled subscription overwrite a newer live one', async () => {
    const user = { id: 'u1', role: 'CLIENT', stripeCustomerId: 'cus_1', subscription: { stripeSubscriptionId: 'sub_new' } };
    const { service, prisma } = setup({ user, sub: stripeSub({ status: 'canceled' }) });
    await service.process(subEvent('customer.subscription.deleted'));
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
  });

  it('keeps the error and rethrows so Stripe retries', async () => {
    const { service, prisma, retrieve } = setup();
    retrieve.mockRejectedValue(new Error('stripe down'));
    await expect(service.process(subEvent())).rejects.toThrow('stripe down');
    expect(prisma.stripeEvent.update).toHaveBeenCalledWith({ where: { id: 'evt_1' }, data: { error: 'stripe down' } });
  });

  it('tolerates a concurrent delivery and writes the audit row with skipDuplicates keyed on the event id', async () => {
    const { service, prisma } = setup();
    prisma.stripeEvent.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }));
    await service.process(subEvent());
    expect(prisma.subscription.upsert).toHaveBeenCalled();
    expect(prisma.billingEvent.createMany.mock.calls[0]?.[0]).toMatchObject({ skipDuplicates: true, data: { stripeEventId: 'evt_1' } });
  });

  it('dedupes platform invoice audit rows the same way', async () => {
    const { service, prisma } = setup();
    const invoice = {
      id: 'in_p',
      amount_paid: 1199,
      amount_due: 1199,
      currency: 'usd',
      parent: { subscription_details: { subscription: 'sub_1', metadata: { kind: 'platform', userId: 'u1', planId: 'athlete-pro' } } },
    };
    await service.process({ id: 'evt_p', type: 'invoice.paid', data: { object: invoice } } as never);
    expect(prisma.billingEvent.createMany.mock.calls[0]?.[0]).toMatchObject({ skipDuplicates: true, data: { stripeEventId: 'evt_p', type: 'PAYMENT_SUCCEEDED' } });
  });

  it('creates an offer payment for a new invoice', async () => {
    const { service, prisma } = setup();
    await service.process(invoiceEvent('invoice.paid'));
    expect(prisma.payment.create.mock.calls[0]?.[0].data).toMatchObject({
      stripeRef: 'in_1', coachId: 'c1', clientId: 'k1', offerId: 'o1', amountCents: 32000, status: 'SUCCEEDED', clientSubscriptionId: 'cs1',
    });
  });

  it('never lets a late payment_failed overwrite a paid invoice', async () => {
    const { service, prisma } = setup();
    prisma.payment.findUnique.mockResolvedValue({ id: 'p1' }); // row exists but is SUCCEEDED, so the guarded update matched nothing
    await service.process(invoiceEvent('invoice.payment_failed'));
    expect(prisma.payment.updateMany.mock.calls[0]?.[0].where).toEqual({ stripeRef: 'in_1', status: { in: ['FAILED'] } });
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('lets a later invoice.paid flip a failed invoice to SUCCEEDED', async () => {
    const { service, prisma } = setup();
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    await service.process(invoiceEvent('invoice.paid'));
    const call = prisma.payment.updateMany.mock.calls[0]?.[0];
    expect(call.where).toEqual({ stripeRef: 'in_1', status: { in: ['FAILED', 'SUCCEEDED'] } });
    expect(call.data.status).toBe('SUCCEEDED');
  });

  it('on a create race, a failure stays out and a success still lands', async () => {
    const dup = new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' });
    const failed = setup();
    failed.prisma.payment.create.mockRejectedValue(dup);
    await failed.service.process(invoiceEvent('invoice.payment_failed'));
    expect(failed.prisma.payment.updateMany).toHaveBeenCalledTimes(1);

    const paid = setup();
    paid.prisma.payment.create.mockRejectedValue(dup);
    await paid.service.process(invoiceEvent('invoice.paid'));
    expect(paid.prisma.payment.updateMany.mock.calls[1]?.[0].where).toEqual({ stripeRef: 'in_1', status: 'FAILED' });
  });

  it('Connect endpoint switches charges off on account.updated and on deauthorization', async () => {
    const { service, prisma } = setup();
    await service.process({ id: 'evt_a', type: 'account.updated', data: { object: { id: 'acct_1', charges_enabled: false } } } as never, 'connect');
    expect(prisma.user.updateMany).toHaveBeenLastCalledWith({ where: { stripeAccountId: 'acct_1' }, data: { stripeChargesEnabled: false } });
    await service.process({ id: 'evt_d', type: 'account.application.deauthorized', account: 'acct_2', data: { object: {} } } as never, 'connect');
    expect(prisma.user.updateMany).toHaveBeenLastCalledWith({ where: { stripeAccountId: 'acct_2' }, data: { stripeChargesEnabled: false } });
  });

  it('Connect endpoint ignores subscription events (they belong to the platform account)', async () => {
    const { service, retrieve } = setup();
    await service.process(subEvent(), 'connect');
    expect(retrieve).not.toHaveBeenCalled();
  });
});
