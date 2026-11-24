import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { BillingEventType, PaymentStatus, Prisma } from '@prisma/client';
import { SubscriptionStatus, planById } from '@coaching/shared';
import type Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { grantsAccess } from './entitlements';
import { fromUnix, mapStripeStatus, periodEnd, stripeId } from './stripe-sync';
import { StripeService, type WebhookEndpoint } from './stripe.service';

/** Metadata we stamp on every checkout session and subscription, so webhooks know who and what. */
type PlatformMeta = { kind: 'platform'; userId: string; planId: string };
type OfferMeta = { kind: 'offer'; offerId: string; coachId: string; clientId: string };

function readMeta(md: Stripe.Metadata | null | undefined): PlatformMeta | OfferMeta | null {
  if (md?.kind === 'platform' && md.userId && md.planId) return { kind: 'platform', userId: md.userId, planId: md.planId };
  if (md?.kind === 'offer' && md.offerId && md.coachId && md.clientId) {
    return { kind: 'offer', offerId: md.offerId, coachId: md.coachId, clientId: md.clientId };
  }
  return null;
}

/**
 * Verified, idempotent Stripe webhook handling. Each event id is recorded in StripeEvent and processed once;
 * a failed event keeps its error and is retried on Stripe's next delivery. Subscription state is always
 * re-read from Stripe, so out-of-order deliveries converge on the latest state. Cancellation only changes
 * subscription status: logged training data is never touched.
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger('StripeWebhook');

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  /**
   * `connect` = the Connect endpoint: Stripe signs connected-account events with a separate secret, and only
   * account events are acted on there (subscriptions and checkouts live on the platform account).
   */
  async receive(rawBody: Buffer | undefined, signature: string | undefined, endpoint: WebhookEndpoint = 'platform'): Promise<void> {
    const secret = this.stripe.webhookSecret(endpoint);
    if (!rawBody || !signature) throw new BadRequestException('Missing Stripe signature');
    let event: Stripe.Event;
    try {
      event = this.stripe.client().webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      throw new BadRequestException('Invalid Stripe signature');
    }
    await this.process(event, endpoint);
  }

  async process(event: Stripe.Event, endpoint: WebhookEndpoint = 'platform'): Promise<void> {
    const seen = await this.prisma.stripeEvent.findUnique({ where: { id: event.id }, select: { processedAt: true } });
    if (seen?.processedAt) return; // duplicate delivery
    if (!seen) {
      try {
        await this.prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
      } catch (err) {
        // A concurrent delivery recorded it first. Handlers are upserts and audit rows are unique per event id,
        // so processing twice is safe.
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
      }
    }
    try {
      await (endpoint === 'connect' ? this.dispatchConnect(event) : this.dispatch(event));
      await this.prisma.stripeEvent.update({ where: { id: event.id }, data: { processedAt: new Date(), error: null } });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`${event.type} ${event.id} failed: ${message}`);
      await this.prisma.stripeEvent.update({ where: { id: event.id }, data: { error: message.slice(0, 1000) } });
      throw err;
    }
  }

  private async dispatch(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        return this.onCheckout(event.data.object, event.id);
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        return this.syncSubscription(event.data.object.id, event.id);
      case 'invoice.paid':
        return this.onInvoice(event.data.object, PaymentStatus.SUCCEEDED, event.id);
      case 'invoice.payment_failed':
        return this.onInvoice(event.data.object, PaymentStatus.FAILED, event.id);
      case 'account.updated':
        return this.setChargesEnabled(event.data.object.id, event.data.object.charges_enabled === true);
      default:
        return; // not subscribed to anything else; acknowledge
    }
  }

  /** Connected-account events. Charges can be switched off as well as on (KYC holds, deauthorization). */
  private async dispatchConnect(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'account.updated':
        return this.setChargesEnabled(event.data.object.id, event.data.object.charges_enabled === true);
      case 'account.application.deauthorized':
        if (event.account) await this.setChargesEnabled(event.account, false);
        return;
      default:
        return;
    }
  }

  private async setChargesEnabled(accountId: string, enabled: boolean): Promise<void> {
    await this.prisma.user.updateMany({ where: { stripeAccountId: accountId }, data: { stripeChargesEnabled: enabled } });
  }

  private async onCheckout(session: Stripe.Checkout.Session, eventId: string): Promise<void> {
    const meta = readMeta(session.metadata);
    if (!meta) return;
    const subscriptionId = stripeId(session.subscription);
    if (subscriptionId) return this.syncSubscription(subscriptionId, eventId, BillingEventType.CHECKOUT_COMPLETED);

    // One-time offer purchase: the session is the payment.
    if (meta.kind === 'offer' && session.mode === 'payment' && session.payment_status === 'paid') {
      await this.recordPayment(meta, {
        stripeRef: session.id,
        amountCents: session.amount_total ?? 0,
        currency: session.currency ?? 'usd',
        status: PaymentStatus.SUCCEEDED,
        paidAt: new Date(),
        clientSubscriptionId: null,
      });
    }
  }

  /** Re-reads the subscription from Stripe and mirrors it into Subscription or ClientSubscription. */
  private async syncSubscription(subscriptionId: string, eventId: string, eventType?: BillingEventType): Promise<void> {
    const sub = await this.stripe.client().subscriptions.retrieve(subscriptionId);
    const meta = readMeta(sub.metadata);
    if (meta?.kind === 'platform') return this.syncPlatform(sub, meta, eventId, eventType);
    if (meta?.kind === 'offer') return this.syncOffer(sub, meta);
  }

  private async syncPlatform(sub: Stripe.Subscription, meta: PlatformMeta, eventId: string, eventType?: BillingEventType): Promise<void> {
    const plan = planById(meta.planId);
    const user = await this.prisma.user.findUnique({ where: { id: meta.userId }, include: { subscription: true } });
    if (!plan || !user || plan.role !== user.role) {
      this.logger.warn(`Ignoring subscription ${sub.id}: unknown user or plan in metadata`);
      return;
    }
    const status = mapStripeStatus(sub.status);
    const trialEndsAt = fromUnix(sub.trial_end);
    const current = user.subscription;
    // An old subscription ending must not overwrite a newer live one (re-subscribe after cancel).
    if (current?.stripeSubscriptionId && current.stripeSubscriptionId !== sub.id && !grantsAccess({ status, trialEndsAt }, new Date())) {
      return;
    }
    const data = {
      planId: plan.id,
      status,
      trialEndsAt,
      currentPeriodEnd: periodEnd(sub),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      stripeSubscriptionId: sub.id,
    };
    const customerId = stripeId(sub.customer);
    await this.prisma.$transaction([
      // clientLimit is left alone on update so grandfathered seats survive; a new row uses the plan default.
      this.prisma.subscription.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data }),
      this.prisma.billingEvent.createMany({
        data: {
          userId: user.id,
          type: eventType ?? (status === SubscriptionStatus.CANCELED ? BillingEventType.SUBSCRIPTION_CANCELED : BillingEventType.SUBSCRIPTION_UPDATED),
          planId: plan.id,
          status,
          stripeEventId: eventId,
        },
        skipDuplicates: true,
      }),
      ...(customerId && !user.stripeCustomerId
        ? [this.prisma.user.updateMany({ where: { id: user.id, stripeCustomerId: null }, data: { stripeCustomerId: customerId } })]
        : []),
    ]);
  }

  private async syncOffer(sub: Stripe.Subscription, meta: OfferMeta): Promise<void> {
    const offer = await this.prisma.coachOffer.findFirst({ where: { id: meta.offerId, coachId: meta.coachId }, select: { id: true } });
    if (!offer) {
      this.logger.warn(`Ignoring subscription ${sub.id}: offer ${meta.offerId} not found`);
      return;
    }
    const item = sub.items.data[0];
    const data = { status: mapStripeStatus(sub.status), currentPeriodEnd: periodEnd(sub), cancelAtPeriodEnd: sub.cancel_at_period_end };
    await this.prisma.clientSubscription.upsert({
      where: { stripeSubscriptionId: sub.id },
      create: {
        ...data,
        stripeSubscriptionId: sub.id,
        offerId: meta.offerId,
        coachId: meta.coachId,
        clientId: meta.clientId,
        amountCents: item?.price.unit_amount ?? 0,
        currency: item?.price.currency ?? 'usd',
      },
      update: data,
    });
  }

  private async onInvoice(invoice: Stripe.Invoice, status: PaymentStatus, eventId: string): Promise<void> {
    const details = invoice.parent?.subscription_details;
    const meta = readMeta(details?.metadata);
    if (!meta) return;
    const amountCents = status === PaymentStatus.SUCCEEDED ? invoice.amount_paid : invoice.amount_due;

    if (meta.kind === 'platform') {
      if (amountCents === 0) return; // trial-start invoices
      await this.prisma.billingEvent.createMany({
        data: {
          userId: meta.userId,
          type: status === PaymentStatus.SUCCEEDED ? BillingEventType.PAYMENT_SUCCEEDED : BillingEventType.PAYMENT_FAILED,
          planId: meta.planId,
          amountCents,
          stripeEventId: eventId,
        },
        skipDuplicates: true,
      });
      return;
    }

    if (amountCents === 0 || !invoice.id) return;
    const subscriptionId = stripeId(details?.subscription);
    const clientSub = subscriptionId
      ? await this.prisma.clientSubscription.findUnique({ where: { stripeSubscriptionId: subscriptionId }, select: { id: true } })
      : null;
    await this.recordPayment(meta, {
      stripeRef: invoice.id,
      amountCents,
      currency: invoice.currency,
      status,
      paidAt: fromUnix(invoice.status_transitions?.paid_at) ?? new Date(),
      clientSubscriptionId: clientSub?.id ?? null,
    });
  }

  /**
   * Upsert by Stripe reference. SUCCEEDED is terminal: a late `invoice.payment_failed` (Stripe does not order
   * events) never downgrades a paid invoice. A failed invoice that is later paid flips to SUCCEEDED.
   */
  private async recordPayment(
    meta: OfferMeta,
    p: { stripeRef: string; amountCents: number; currency: string; status: PaymentStatus; paidAt: Date; clientSubscriptionId: string | null },
  ): Promise<void> {
    const update = { status: p.status, amountCents: p.amountCents, paidAt: p.paidAt, ...(p.clientSubscriptionId ? { clientSubscriptionId: p.clientSubscriptionId } : {}) };
    // Conditional update: FAILED may only overwrite FAILED; SUCCEEDED may overwrite anything but a refund.
    const overwritable = p.status === PaymentStatus.FAILED ? [PaymentStatus.FAILED] : [PaymentStatus.FAILED, PaymentStatus.SUCCEEDED];
    const { count } = await this.prisma.payment.updateMany({ where: { stripeRef: p.stripeRef, status: { in: overwritable } }, data: update });
    if (count > 0) return;
    if (await this.prisma.payment.findUnique({ where: { stripeRef: p.stripeRef }, select: { id: true } })) return; // terminal row

    const offer = await this.prisma.coachOffer.findFirst({ where: { id: meta.offerId, coachId: meta.coachId }, select: { id: true } });
    try {
      await this.prisma.payment.create({ data: { ...p, coachId: meta.coachId, clientId: meta.clientId, offerId: offer?.id ?? null } });
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
      // Lost a race with the other invoice event: only a success may still apply.
      if (p.status === PaymentStatus.SUCCEEDED) {
        await this.prisma.payment.updateMany({ where: { stripeRef: p.stripeRef, status: PaymentStatus.FAILED }, data: update });
      }
    }
  }
}
