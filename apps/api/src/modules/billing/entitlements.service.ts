import { HttpException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Feature, PlanId, Role } from '@coaching/shared';
import type { EntitlementsDto, PlanId as PlanIdType, SubscriptionStatus } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCESSIBLE_LINK_STATUSES, isAccessibleLink } from '../clients/link-status';
import { UPGRADE_MESSAGES, grantsAccess, passesProToClients, resolveAccess, seatVerdict, type SeatVerdict, type PlanFacts, type ResolvedAccess } from './entitlements';

const planInclude = { entitlements: { select: { feature: true } } } satisfies Prisma.PlanInclude;
type PlanRow = Prisma.PlanGetPayload<{ include: typeof planInclude }>;

const toFacts = (p: PlanRow): PlanFacts => ({
  id: p.id,
  role: p.role,
  clientLimit: p.clientLimit,
  features: p.entitlements.map((e) => e.feature as Feature),
});

/** Server-side source of truth for what a user may do. */
@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  private async load(userId: string) {
    const [user, proPlan] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          role: true,
          stripeCustomerId: true,
          coachLink: {
            select: {
              status: true,
              coach: { select: { subscription: { select: { status: true, trialEndsAt: true, plan: { select: { role: true } } } } } },
            },
          },
          subscription: { include: { plan: { include: planInclude } } },
        },
      }),
      this.prisma.plan.findUniqueOrThrow({ where: { id: PlanId.ATHLETE_PRO }, include: planInclude }),
    ]);
    if (!user) throw new HttpException('Unauthorized', 401);
    const sub = user.subscription;
    const now = new Date();
    const coachSub = user.coachLink?.coach.subscription;
    const access = resolveAccess({
      role: user.role as Role,
      coachGrantsPro:
        isAccessibleLink(user.coachLink?.status) &&
        passesProToClients(
          coachSub ? { status: coachSub.status as SubscriptionStatus, trialEndsAt: coachSub.trialEndsAt, planRole: coachSub.plan.role as Role } : null,
          now,
        ),
      proPlan: toFacts(proPlan),
      subscription: sub
        ? { status: sub.status as SubscriptionStatus, clientLimit: sub.clientLimit, trialEndsAt: sub.trialEndsAt, plan: toFacts(sub.plan) }
        : null,
      now,
    });
    return { user, sub, access, now };
  }

  async resolve(userId: string): Promise<ResolvedAccess> {
    return (await this.load(userId)).access;
  }

  async forUser(userId: string): Promise<EntitlementsDto> {
    const { user, sub, access, now } = await this.load(userId);
    const seatsUsed = user.role === Role.COACH ? await this.seatsUsed(userId) : null;
    return {
      planId: access.planId as PlanIdType | null,
      status: (sub?.status as SubscriptionStatus | undefined) ?? null,
      source: access.source,
      features: access.features,
      trialEndsAt: sub?.trialEndsAt?.toISOString() ?? null,
      currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      clientLimit: access.clientLimit,
      seatsUsed,
      canManageBilling: user.stripeCustomerId !== null,
      hasStripeSubscription:
        sub?.stripeSubscriptionId != null && grantsAccess({ status: sub.status as SubscriptionStatus, trialEndsAt: sub.trialEndsAt }, now),
    };
  }

  /** ACTIVE and PAUSED clients (only ARCHIVED frees a seat) plus unexpired pending invites. `exceptInviteEmail` skips an invite about to be replaced. */
  async seatsUsed(coachId: string, exceptInviteEmail?: string): Promise<number> {
    const [clients, invites] = await Promise.all([
      this.prisma.coachClient.count({ where: { coachId, status: { in: [...ACCESSIBLE_LINK_STATUSES] } } }),
      this.prisma.invite.count({
        where: {
          coachId,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
          ...(exceptInviteEmail ? { NOT: { email: exceptInviteEmail } } : {}),
        },
      }),
    ]);
    return clients + invites;
  }

  /** Whether the coach can take one more client. `exceptInviteEmail` leaves that invite's own seat out of the count. */
  async seatFor(coachId: string, exceptInviteEmail?: string): Promise<SeatVerdict> {
    const [access, used] = await Promise.all([this.resolve(coachId), this.seatsUsed(coachId, exceptInviteEmail)]);
    return seatVerdict(access, used);
  }

  /**
   * 402 unless the coach has a free seat. Called before a client is added or moved back from ARCHIVED.
   * Being over the limit never hides or removes existing clients; it only blocks adding more.
   */
  async assertSeat(coachId: string, exceptInviteEmail?: string): Promise<void> {
    const verdict = await this.seatFor(coachId, exceptInviteEmail);
    if (verdict.ok) return;
    if (verdict.reason === 'NO_PLAN') throw new HttpException(UPGRADE_MESSAGES[Feature.COACH_CLIENTS] as string, 402);
    throw new HttpException(
      `Client limit reached: ${verdict.used} of ${verdict.limit} seats in use (active and paused clients plus pending invites). Archive a client or revoke an invite to free a seat.`,
      402,
    );
  }
}
