import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PlanId, planById } from '@coaching/shared';
import type { RedirectUrlDto, SubscriptionStatus } from '@coaching/shared';
import { EnvService } from '../../config/env.service';
import { PrismaService } from '../../prisma/prisma.service';
import { grantsAccess } from './entitlements';
import { StripeService } from './stripe.service';

/** Stripe's minimum lead time for an explicit trial_end. */
const MIN_TRIAL_END_MS = 48 * 60 * 60 * 1000;

const billingPath = (role: Role): '/coach/billing' | '/client/billing' => (role === Role.COACH ? '/coach/billing' : '/client/billing');

/** Platform plan checkout and the Stripe billing portal. */
@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly env: EnvService,
  ) {}

  private priceFor(planId: string): string | undefined {
    if (planId === PlanId.ATHLETE_PRO) return this.env.get('STRIPE_PRICE_ATHLETE_PRO');
    if (planId === PlanId.COACH) return this.env.get('STRIPE_PRICE_COACH');
    return undefined;
  }

  async checkout(userId: string, planId: string): Promise<RedirectUrlDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { subscription: true } });
    const plan = planById(planId);
    if (!plan || plan.priceCents === 0 || plan.role !== user.role) {
      throw new BadRequestException('This plan is not available for your account');
    }
    const price = this.priceFor(plan.id);
    const stripe = this.stripe.client();
    if (!price) throw new ServiceUnavailableException('Payments are not configured');

    const now = new Date();
    const sub = user.subscription;
    if (sub?.stripeSubscriptionId && grantsAccess({ status: sub.status as SubscriptionStatus, trialEndsAt: sub.trialEndsAt }, now)) {
      throw new ConflictException('You already have an active subscription. Manage it from the billing portal.');
    }
    // A coach still inside the free trial keeps the remaining days: billing starts when the trial ends.
    const trialEnd =
      sub && !sub.stripeSubscriptionId && sub.trialEndsAt && sub.trialEndsAt.getTime() - now.getTime() > MIN_TRIAL_END_MS
        ? Math.floor(sub.trialEndsAt.getTime() / 1000)
        : undefined;

    const metadata = { kind: 'platform', userId, planId: plan.id };
    const path = billingPath(user.role);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: await this.ensureCustomer(userId),
      client_reference_id: userId,
      line_items: [{ price, quantity: 1 }],
      metadata,
      subscription_data: { metadata, ...(trialEnd ? { trial_end: trialEnd } : {}) },
      success_url: this.stripe.webUrl(`${path}?checkout=success`),
      cancel_url: this.stripe.webUrl(`${path}?checkout=cancelled`),
    });
    if (!session.url) throw new ServiceUnavailableException('Stripe did not return a checkout URL');
    return { url: session.url };
  }

  async portal(userId: string): Promise<RedirectUrlDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { role: true, stripeCustomerId: true } });
    const stripe = this.stripe.client();
    if (!user.stripeCustomerId) throw new ConflictException('No billing account yet. Subscribe to a plan first.');
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: this.stripe.webUrl(billingPath(user.role)),
    });
    return { url: session.url };
  }

  /** The user's platform Stripe customer, created once. Concurrent callers converge on the stored id. */
  async ensureCustomer(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, name: true, stripeCustomerId: true } });
    if (user.stripeCustomerId) return user.stripeCustomerId;
    const customer = await this.stripe.client().customers.create(
      { email: user.email, name: user.name, metadata: { userId } },
      { idempotencyKey: `customer-${userId}` },
    );
    await this.prisma.user.updateMany({ where: { id: userId, stripeCustomerId: null }, data: { stripeCustomerId: customer.id } });
    const stored = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { stripeCustomerId: true } });
    return stored.stripeCustomerId ?? customer.id;
  }
}
