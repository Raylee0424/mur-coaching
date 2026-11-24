import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { OfferInterval, Prisma, SubscriptionStatus } from '@prisma/client';
import type {
  ClientOffersDto,
  ClientSubscriptionDto,
  CoachBillingDto,
  CoachOfferDto,
  PaymentDto,
  RedirectUrlDto,
} from '@coaching/shared';
import { EnvService } from '../../config/env.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCESSIBLE_LINK_STATUSES } from '../clients/link-status';
import { BillingService } from './billing.service';
import type { CreateCoachOfferDto } from './dto/billing.dto';
import { StripeService } from './stripe.service';

/** Statuses that hold a seat in "active subscriptions" counts. */
const LIVE_STATUSES: SubscriptionStatus[] = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE];

const offerSelect = {
  id: true,
  name: true,
  description: true,
  priceCents: true,
  currency: true,
  interval: true,
  archivedAt: true,
  createdAt: true,
  _count: { select: { subscriptions: { where: { status: { in: LIVE_STATUSES } } } } },
} satisfies Prisma.CoachOfferSelect;

const toOffer = (o: Prisma.CoachOfferGetPayload<{ select: typeof offerSelect }>): CoachOfferDto => ({
  id: o.id,
  name: o.name,
  description: o.description,
  priceCents: o.priceCents,
  currency: o.currency,
  interval: o.interval,
  archived: o.archivedAt !== null,
  activeCount: o._count.subscriptions,
  createdAt: o.createdAt.toISOString(),
});

const subInclude = { offer: { select: { name: true } }, client: { select: { name: true } } } satisfies Prisma.ClientSubscriptionInclude;

const toSub = (s: Prisma.ClientSubscriptionGetPayload<{ include: typeof subInclude }>): ClientSubscriptionDto => ({
  id: s.id,
  offerId: s.offerId,
  offerName: s.offer.name,
  clientId: s.clientId,
  clientName: s.client.name,
  amountCents: s.amountCents,
  currency: s.currency,
  status: s.status,
  currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
  cancelAtPeriodEnd: s.cancelAtPeriodEnd,
});

/** Coach offers sold through Stripe Connect (destination charges: the platform charges, the coach is paid out). */
@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly billing: BillingService,
    private readonly env: EnvService,
  ) {}

  async coachBilling(coachId: string): Promise<CoachBillingDto> {
    const coach = await this.refreshConnect(coachId);
    const [offers, subs, payments] = await Promise.all([
      this.prisma.coachOffer.findMany({ where: { coachId }, select: offerSelect, orderBy: [{ archivedAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }] }),
      this.prisma.clientSubscription.findMany({ where: { coachId }, include: subInclude, orderBy: { updatedAt: 'desc' } }),
      this.prisma.payment.findMany({
        where: { coachId },
        include: { client: { select: { name: true } }, offer: { select: { name: true } } },
        orderBy: { paidAt: 'desc' },
        take: 20,
      }),
    ]);
    const active = subs.filter((s) => s.status === SubscriptionStatus.ACTIVE);
    return {
      connect: { connected: coach.stripeAccountId !== null, chargesEnabled: coach.stripeChargesEnabled },
      stripeConfigured: this.stripe.configured,
      stats: {
        mrrCents: active.reduce((sum, s) => sum + s.amountCents, 0),
        activeCount: subs.filter((s) => LIVE_STATUSES.includes(s.status) && s.status !== SubscriptionStatus.PAST_DUE).length,
        pastDueCount: subs.filter((s) => s.status === SubscriptionStatus.PAST_DUE).length,
      },
      offers: offers.map(toOffer),
      subscriptions: subs.map(toSub),
      payments: payments.map(
        (p): PaymentDto => ({
          id: p.id,
          clientName: p.client.name,
          offerName: p.offer?.name ?? null,
          amountCents: p.amountCents,
          currency: p.currency,
          status: p.status,
          paidAt: p.paidAt.toISOString(),
        }),
      ),
    };
  }

  async createOffer(coachId: string, dto: CreateCoachOfferDto): Promise<CoachOfferDto> {
    const row = await this.prisma.coachOffer.create({
      data: { coachId, name: dto.name.trim(), description: dto.description?.trim() || null, priceCents: dto.priceCents, interval: dto.interval },
      select: offerSelect,
    });
    return toOffer(row);
  }

  /** Soft archive: clients stop seeing it; live subscriptions keep billing until cancelled in Stripe. */
  async archiveOffer(coachId: string, id: string): Promise<void> {
    const { count } = await this.prisma.coachOffer.updateMany({ where: { id, coachId, archivedAt: null }, data: { archivedAt: new Date() } });
    if (count === 0) throw new NotFoundException('Offer not found');
  }

  /** Creates the coach's Express account once, then returns a fresh onboarding link. */
  async connect(coachId: string): Promise<RedirectUrlDto> {
    const stripe = this.stripe.client();
    let coach = await this.prisma.user.findUniqueOrThrow({ where: { id: coachId }, select: { email: true, stripeAccountId: true } });
    if (!coach.stripeAccountId) {
      const account = await stripe.accounts.create(
        {
          type: 'express',
          email: coach.email,
          metadata: { userId: coachId },
          capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        },
        { idempotencyKey: `connect-${coachId}` },
      );
      await this.prisma.user.updateMany({ where: { id: coachId, stripeAccountId: null }, data: { stripeAccountId: account.id } });
      coach = await this.prisma.user.findUniqueOrThrow({ where: { id: coachId }, select: { email: true, stripeAccountId: true } });
    }
    const link = await stripe.accountLinks.create({
      account: coach.stripeAccountId as string,
      type: 'account_onboarding',
      return_url: this.stripe.webUrl('/coach/billing?connect=return'),
      refresh_url: this.stripe.webUrl('/coach/billing?connect=refresh'),
    });
    return { url: link.url };
  }

  /** One-time login link to the coach's Express dashboard (payouts, disputes). */
  async dashboard(coachId: string): Promise<RedirectUrlDto> {
    const stripe = this.stripe.client();
    const coach = await this.prisma.user.findUniqueOrThrow({ where: { id: coachId }, select: { stripeAccountId: true } });
    if (!coach.stripeAccountId) throw new ConflictException('Connect Stripe first');
    const link = await stripe.accounts.createLoginLink(coach.stripeAccountId);
    return { url: link.url };
  }

  async clientOffers(clientId: string): Promise<ClientOffersDto> {
    const [link, subs] = await Promise.all([
      this.prisma.coachClient.findFirst({
        where: { clientId, status: { in: [...ACCESSIBLE_LINK_STATUSES] } },
        select: { coach: { select: { id: true, name: true, displayName: true, stripeChargesEnabled: true } } },
      }),
      this.prisma.clientSubscription.findMany({ where: { clientId }, include: subInclude, orderBy: { updatedAt: 'desc' } }),
    ]);
    const offers = link
      ? await this.prisma.coachOffer.findMany({ where: { coachId: link.coach.id, archivedAt: null }, select: offerSelect, orderBy: { createdAt: 'asc' } })
      : [];
    return {
      coachName: link ? (link.coach.displayName ?? link.coach.name) : null,
      purchasable: Boolean(link?.coach.stripeChargesEnabled) && this.stripe.configured,
      offers: offers.map(toOffer),
      subscriptions: subs.map(toSub),
    };
  }

  /** Checkout for one of the client's own coach's offers. Tenancy: the offer must belong to the linked coach. */
  async checkoutOffer(clientId: string, offerId: string): Promise<RedirectUrlDto> {
    const link = await this.prisma.coachClient.findFirst({
      where: { clientId, status: { in: [...ACCESSIBLE_LINK_STATUSES] } },
      select: { coachId: true, coach: { select: { stripeAccountId: true, stripeChargesEnabled: true } } },
    });
    const offer = link ? await this.prisma.coachOffer.findFirst({ where: { id: offerId, coachId: link.coachId, archivedAt: null } }) : null;
    if (!link || !offer) throw new NotFoundException('Offer not found');
    const stripe = this.stripe.client();
    const destination = link.coach.stripeAccountId;
    if (!destination || !link.coach.stripeChargesEnabled) throw new ConflictException('Your coach has not finished setting up payments yet');

    if (offer.interval === OfferInterval.MONTH) {
      const existing = await this.prisma.clientSubscription.findFirst({ where: { clientId, offerId, status: { in: LIVE_STATUSES } }, select: { id: true } });
      if (existing) throw new ConflictException('You already subscribe to this offer. Manage it from the billing portal.');
    }

    const feePercent = this.env.get('STRIPE_PLATFORM_FEE_PERCENT');
    const metadata = { kind: 'offer', offerId: offer.id, coachId: link.coachId, clientId };
    const product_data = { name: offer.name, ...(offer.description ? { description: offer.description } : {}) };
    const common = {
      customer: await this.billing.ensureCustomer(clientId),
      client_reference_id: clientId,
      metadata,
      success_url: this.stripe.webUrl('/client/billing?checkout=success'),
      cancel_url: this.stripe.webUrl('/client/billing?checkout=cancelled'),
    };

    const session =
      offer.interval === OfferInterval.MONTH
        ? await stripe.checkout.sessions.create({
            ...common,
            mode: 'subscription',
            line_items: [{ quantity: 1, price_data: { currency: offer.currency, unit_amount: offer.priceCents, recurring: { interval: 'month' }, product_data } }],
            subscription_data: {
              metadata,
              transfer_data: { destination },
              ...(feePercent > 0 ? { application_fee_percent: feePercent } : {}),
            },
          })
        : await stripe.checkout.sessions.create({
            ...common,
            mode: 'payment',
            line_items: [{ quantity: 1, price_data: { currency: offer.currency, unit_amount: offer.priceCents, product_data } }],
            payment_intent_data: {
              metadata,
              transfer_data: { destination },
              ...(feePercent > 0 ? { application_fee_amount: Math.round((offer.priceCents * feePercent) / 100) } : {}),
            },
          });
    if (!session.url) throw new ServiceUnavailableException('Stripe did not return a checkout URL');
    return { url: session.url };
  }

  /**
   * Mirrors the Connect account's charges_enabled on every page load, both ways, so a coach whose account
   * Stripe disabled stops being offered to clients even if the Connect webhook is missing (local dev).
   */
  private async refreshConnect(coachId: string) {
    const coach = await this.prisma.user.findUniqueOrThrow({ where: { id: coachId }, select: { stripeAccountId: true, stripeChargesEnabled: true } });
    if (!coach.stripeAccountId || !this.stripe.configured) return coach;
    try {
      const account = await this.stripe.client().accounts.retrieve(coach.stripeAccountId);
      const enabled = account.charges_enabled === true;
      if (enabled !== coach.stripeChargesEnabled) {
        await this.prisma.user.update({ where: { id: coachId }, data: { stripeChargesEnabled: enabled } });
      }
      return { ...coach, stripeChargesEnabled: enabled };
    } catch {
      return coach; // Stripe unreachable: show the stored status.
    }
  }
}
