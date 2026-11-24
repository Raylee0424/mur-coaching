import clsx from 'clsx';
import { PLANS, PlanId, Role, formatMoney } from '@coaching/shared';
import { checkoutOffer, openBillingPortal, startCheckout } from '@/actions/billing';
import { PlanCards } from '@/components/billing/PlanCards';
import { StripeActionButton } from '@/components/billing/StripeActionButton';
import { SubscriptionsTable } from '@/components/billing/SubscriptionsTable';
import { Badge } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { ToastOnMount } from '@/components/ui/ToastOnMount';
import { billingApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { STATUS_LABEL, STATUS_TONE, offerBlockReason, orderOffers, planStateLine } from '@/lib/billing';
import { firstParam } from '@/lib/form';
import { formatDate } from '@/lib/format';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const ATHLETE_PLANS = PLANS.filter((p) => p.role === Role.CLIENT);

export default async function ClientBillingPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser(Role.CLIENT);
  const [ent, offers, params] = await Promise.all([billingApi.entitlements(), billingApi.clientOffers(), searchParams]);
  const checkout = firstParam(params.checkout);
  const ownPro = ent.source === 'SUBSCRIPTION';
  const currentPlanId = ent.source === 'COACH' ? null : ent.planId;
  const linkedOfferId = firstParam(params.offer);
  const shownOffers = orderOffers(offers.offers, linkedOfferId);
  const linkedMissing = linkedOfferId !== undefined && !offers.offers.some((o) => o.id === linkedOfferId);

  return (
    <>
      {checkout === 'success' ? <ToastOnMount message="Payment received. It can take a few seconds to show here." tone="ok" /> : null}
      {checkout === 'cancelled' ? <ToastOnMount message="Checkout cancelled. Nothing was charged." /> : null}
      <PageHeader title="Billing" back={{ href: '/client/profile', label: 'Profile' }} />
      <div className="max-w-5xl space-y-8">
        <Panel
          title="Your plan"
          meta={ent.status ? <Badge tone={STATUS_TONE[ent.status]}>{STATUS_LABEL[ent.status]}</Badge> : undefined}
          actions={
            ent.canManageBilling ? <StripeActionButton action={openBillingPortal} label="Manage billing" variant="secondary" size="sm" /> : undefined
          }
        >
          <div className="space-y-1 p-4">
            <p className="text-ui">{planStateLine(ent)}</p>
            {ownPro && ent.currentPeriodEnd ? (
              <p className="text-meta text-muted">
                {ent.cancelAtPeriodEnd ? 'Access ends' : 'Next renewal'}: {formatDate(ent.currentPeriodEnd)}
              </p>
            ) : null}
            {ent.canManageBilling ? (
              <p className="text-meta text-muted">Card, invoices and receipts live in the Stripe billing portal.</p>
            ) : null}
          </div>
        </Panel>

        <section aria-labelledby="plans-heading" className="space-y-3">
          <h2 id="plans-heading" className="text-ui font-semibold">
            Plans
          </h2>
          <PlanCards
            plans={ATHLETE_PLANS}
            currentPlanId={currentPlanId}
            action={(plan) => {
              if (plan.id === PlanId.ATHLETE_FREE) {
                return <p className="text-meta text-muted">{ownPro ? 'Cancel Pro in the billing portal to return here. Logs stay.' : 'Included for everyone.'}</p>;
              }
              if (ownPro) return <p className="text-meta text-muted">You are on Pro.</p>;
              return (
                <StripeActionButton
                  action={startCheckout}
                  fields={{ planId: plan.id }}
                  label={`Upgrade for ${formatMoney(plan.priceCents)}/mo`}
                  disabledReason={ent.source === 'COACH' ? 'Pro is already included with your coaching.' : null}
                />
              );
            }}
          />
        </section>

        {linkedMissing ? (
          <p role="status" className="text-ui text-amber">
            The offer in that link is no longer available{offers.coachName ? '' : ', or you are not coached by the coach who shared it'}.
          </p>
        ) : null}

        {offers.coachName ? (
          <Panel title={`Coaching with ${offers.coachName}`} meta={`${offers.offers.length} ${offers.offers.length === 1 ? 'offer' : 'offers'}`}>
            {shownOffers.length === 0 ? (
              <p className="p-4 text-ui text-muted">Your coach has no offers to buy here yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {shownOffers.map((o) => {
                  const linked = o.id === linkedOfferId;
                  return (
                    <li
                      key={o.id}
                      id={`offer-${o.id}`}
                      aria-current={linked ? 'true' : undefined}
                      className={clsx(
                        'flex scroll-mt-20 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between',
                        linked && 'bg-signal-bg ring-1 ring-inset ring-primary',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-ui font-medium">
                          {o.name}
                          {linked ? <Badge tone="signal">From your coach&apos;s link</Badge> : null}
                        </p>
                        <p className="text-meta text-muted">
                          {formatMoney(o.priceCents, o.currency)}
                          {o.interval === 'MONTH' ? ' / month' : ' one-time'}
                          {o.description ? ` · ${o.description}` : ''}
                        </p>
                      </div>
                      <StripeActionButton
                        action={checkoutOffer}
                        fields={{ offerId: o.id }}
                        label={o.interval === 'MONTH' ? 'Subscribe' : 'Pay'}
                        variant={linked ? 'primary' : 'secondary'}
                        size="sm"
                        className="sm:w-48"
                        disabledReason={offerBlockReason(o, offers.subscriptions, offers.purchasable)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        ) : null}

        {offers.subscriptions.length > 0 ? (
          <Panel title="Coaching subscriptions">
            <SubscriptionsTable rows={offers.subscriptions} showClient={false} />
          </Panel>
        ) : null}
      </div>
    </>
  );
}
