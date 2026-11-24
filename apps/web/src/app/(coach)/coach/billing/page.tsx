import clsx from 'clsx';
import { CreditCard } from 'lucide-react';
import { Feature, PlanId, Role, formatMoney, planById } from '@coaching/shared';
import { connectStripe, openBillingPortal, openStripeDashboard, startCheckout } from '@/actions/billing';
import { OfferActions } from '@/components/billing/OfferActions';
import { OfferForm } from '@/components/billing/OfferForm';
import { StripeActionButton } from '@/components/billing/StripeActionButton';
import { SubscriptionsTable } from '@/components/billing/SubscriptionsTable';
import { Badge } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatStrip } from '@/components/ui/StatStrip';
import { ToastOnMount } from '@/components/ui/ToastOnMount';
import { TABLE, TD, TD_NUM, TH, TH_NUM, THEAD, TR } from '@/components/ui/table';
import { billingApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { webOrigin } from '@/lib/origin';
import { STATUS_LABEL, STATUS_TONE, planStateLine, seatWarning, showCoachCheckout } from '@/lib/billing';
import { firstParam } from '@/lib/form';
import { formatDate } from '@/lib/format';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CoachBillingPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser(Role.COACH);
  const [ent, billing, params, origin] = await Promise.all([billingApi.entitlements(), billingApi.coachOverview(), searchParams, webOrigin()]);
  const plan = planById(PlanId.COACH);
  const checkout = firstParam(params.checkout);
  const connectReturn = firstParam(params.connect);
  const warning = seatWarning(ent);
  const showCheckout = showCoachCheckout(ent);
  const canSell = ent.features.includes(Feature.CLIENT_PAYMENTS);
  const offerBlock = canSell ? null : 'Needs an active coach plan.';
  const connectBlock = !billing.stripeConfigured ? 'Payments are not configured on this server.' : !canSell ? 'Needs an active coach plan.' : null;
  const liveOffers = billing.offers.filter((o) => !o.archived);

  const seatsUsed = ent.seatsUsed ?? 0;
  const seatLimit = ent.clientLimit ?? 0;
  const seatPct = seatLimit > 0 ? Math.min(100, Math.round((seatsUsed / seatLimit) * 100)) : 0;

  return (
    <>
      {checkout === 'success' ? <ToastOnMount message="Subscribed. It can take a few seconds to show here." tone="ok" /> : null}
      {checkout === 'cancelled' ? <ToastOnMount message="Checkout cancelled. Nothing was charged." /> : null}
      {connectReturn === 'return' && !billing.connect.chargesEnabled ? (
        <ToastOnMount message="Stripe is still reviewing your details. Offers go live once charges are enabled." />
      ) : null}

      <PageHeader
        title="Coach Console Billing"
        meta={
          ent.status ? (
            <Badge tone={STATUS_TONE[ent.status]}>{STATUS_LABEL[ent.status]}</Badge>
          ) : billing.connect.chargesEnabled ? (
            <Badge tone="emerald">Stripe Connected</Badge>
          ) : (
            <Badge>Free / Trial</Badge>
          )
        }
        actions={<OfferForm disabledReason={offerBlock} />}
      />

      <div className="space-y-6">
        {/* 1. Current Plan Banner + Seat Capacity Meter (`mur_coaching_coach_console_billing`) */}
        <section className="flex flex-col gap-5 rounded-md border border-primary/40 bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-label-sm uppercase text-primary">CURRENT PLAN</span>
              <h2 className="font-display text-headline-md text-ink">
                Coaches Plan · {plan ? `${formatMoney(plan.priceCents)}/mo` : '$19.99/mo'}
              </h2>
              <p className="font-sans text-label-md font-normal text-muted">
                {planStateLine(ent)}
                {ent.hasStripeSubscription && ent.currentPeriodEnd
                  ? ` · ${ent.cancelAtPeriodEnd ? 'Ends' : 'Renews'} ${formatDate(ent.currentPeriodEnd)}`
                  : ''}
              </p>
              {warning ? (
                <p role="status" className="mt-1 font-sans text-label-sm text-amber">
                  {warning}
                </p>
              ) : null}
            </div>

            {showCheckout && plan ? (
              <StripeActionButton
                action={startCheckout}
                fields={{ planId: plan.id }}
                label={`Subscribe · ${formatMoney(plan.priceCents)}/mo`}
                className="sm:w-56"
                disabledReason={billing.stripeConfigured ? null : 'Payments are not configured on this server.'}
              />
            ) : ent.canManageBilling ? (
              <StripeActionButton action={openBillingPortal} label="Manage Plan & Seats" variant="primary" className="sm:w-52" />
            ) : null}
          </div>

          <div className="flex flex-col gap-2.5 rounded-sm border border-line bg-canvas-low p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-sans text-label-md text-ink tabular-nums">
                {seatsUsed} / {seatLimit} Active Seats Used
              </span>
              <span className={clsx('font-mono text-label-sm tabular-nums', seatPct >= 90 ? 'text-amber' : 'text-primary')}>
                {seatPct}% Capacity
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full border border-line bg-card">
              <div
                className={clsx('h-full rounded-full transition-all', seatPct >= 100 ? 'bg-rose' : seatPct >= 90 ? 'bg-amber' : 'bg-primary')}
                style={{ width: `${seatPct}%` }}
              />
            </div>
            <p className="font-mono text-label-sm text-muted">
              Counts active &amp; paused athletes plus pending invites · Over-limit never deletes logged data
            </p>
          </div>
        </section>

        {/* 2. Payment Method & Stripe Customer Portal Card (`mur_coaching_coach_console_billing`) */}
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-line bg-card p-6">
          <div className="flex items-center gap-4">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-sm border border-line bg-canvas-low text-primary">
              <Icon icon={CreditCard} size={20} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-display text-title-md text-ink">
                  {ent.hasStripeSubscription ? 'Payment Method on File' : 'No Card Required on Trial'}
                </h2>
                <Badge tone={ent.hasStripeSubscription ? 'emerald' : 'slate'}>
                  {ent.hasStripeSubscription ? 'Default' : 'Stripe Hosted'}
                </Badge>
              </div>
              <p className="mt-0.5 font-mono text-label-sm text-muted">
                {user.email} · Card &amp; PDF tax invoices managed securely via Stripe
              </p>
            </div>
          </div>

          {ent.canManageBilling ? (
            <StripeActionButton action={openBillingPortal} label="Update Card & Receipts" variant="secondary" />
          ) : showCheckout && plan ? (
            <StripeActionButton
              action={startCheckout}
              fields={{ planId: plan.id }}
              label="Add Payment Method"
              variant="secondary"
              disabledReason={billing.stripeConfigured ? null : 'Payments are not configured on this server.'}
            />
          ) : null}
        </section>

        {/* 3. Client Payments KPI Strip + Offers & Subscriptions */}
        <StatStrip
          label="Client payments"
          items={[
            { label: 'Net MRR', value: formatMoney(billing.stats.mrrCents), emphasis: billing.stats.mrrCents > 0 },
            { label: 'Active Subscriptions', value: String(billing.stats.activeCount) },
            { label: 'Past Due', value: String(billing.stats.pastDueCount), delta: billing.stats.pastDueCount > 0 ? { text: 'Needs follow-up', tone: 'bad' } : { text: 'All current', tone: 'good' } },
          ]}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Panel
            title="Coaching Offers"
            meta={`${liveOffers.length} live`}
            actions={
              billing.connect.connected ? (
                <StripeActionButton action={openStripeDashboard} label="Open Stripe" variant="ghost" size="sm" />
              ) : undefined
            }
          >
            {!billing.connect.chargesEnabled ? (
              <div className="space-y-3 border-b border-line bg-canvas-low p-5">
                <div className="flex items-center gap-2">
                  <Badge tone={billing.connect.connected ? 'amber' : 'slate'}>
                    {billing.connect.connected ? 'Stripe Setup Incomplete' : 'Stripe Not Connected'}
                  </Badge>
                </div>
                <p className="font-sans text-label-md font-normal text-muted">
                  Connect a Stripe account to collect client coaching payments. Stripe handles payouts and tax details; MUR Coaching never stores card numbers.
                </p>
                <StripeActionButton
                  action={connectStripe}
                  label={billing.connect.connected ? 'Finish Stripe Setup' : 'Connect Stripe'}
                  size="sm"
                  className="sm:w-56"
                  disabledReason={connectBlock}
                />
              </div>
            ) : null}
            {liveOffers.length === 0 ? (
              <div className="p-5">
                <EmptyState title="No offers yet">Create an offer, then copy its checkout link to a client.</EmptyState>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {liveOffers.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                    <div className="min-w-0">
                      <p className="truncate font-display text-title-md text-ink">{o.name}</p>
                      <p className="mt-0.5 font-mono text-label-sm text-muted tabular-nums">
                        {formatMoney(o.priceCents, o.currency)}
                        {o.interval === 'MONTH' ? '/mo' : ' one-time'} · {o.activeCount} active
                      </p>
                    </div>
                    <OfferActions offerId={o.id} name={o.name} checkoutUrl={`${origin}/client/billing?offer=${encodeURIComponent(o.id)}`} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Client Payment Statuses" meta="Synced from Stripe">
            {billing.subscriptions.length === 0 ? (
              <div className="p-5">
                <EmptyState title="No client subscriptions yet">They appear here once a client checks out.</EmptyState>
              </div>
            ) : (
              <SubscriptionsTable rows={billing.subscriptions} showClient />
            )}
          </Panel>
        </div>

        {/* 4. Stripe Invoice & Payment History Table */}
        <Panel
          title="Stripe Invoice & Payment History"
          meta={billing.payments.length > 0 ? `Last ${billing.payments.length}` : 'Synced via Stripe'}
          actions={
            ent.canManageBilling ? (
              <StripeActionButton action={openBillingPortal} label="Platform PDF Invoices" variant="ghost" size="sm" />
            ) : undefined
          }
        >
          {billing.payments.length === 0 ? (
            <p className="px-6 py-8 font-sans text-body-md text-muted">
              No client charges recorded yet. Platform subscription PDF receipts are available anytime in your Stripe billing portal.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className={TABLE}>
                <thead className={THEAD}>
                  <tr>
                    <th scope="col" className={TH}>Date</th>
                    <th scope="col" className={TH}>Client</th>
                    <th scope="col" className={TH}>Offer</th>
                    <th scope="col" className={TH_NUM}>Amount</th>
                    <th scope="col" className={TH}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {billing.payments.map((p) => (
                    <tr key={p.id} className={TR}>
                      <td className={clsx(TD, 'font-mono')}>{formatDate(p.paidAt)}</td>
                      <td className={clsx(TD, 'font-sans text-label-md text-ink')}>{p.clientName}</td>
                      <td className={clsx(TD, 'text-muted')}>{p.offerName ?? '—'}</td>
                      <td className={TD_NUM}>{formatMoney(p.amountCents, p.currency)}</td>
                      <td className={TD}>
                        <Badge tone={p.status === 'SUCCEEDED' ? 'emerald' : p.status === 'FAILED' ? 'red' : 'slate'}>
                          {p.status === 'SUCCEEDED' ? 'Paid' : p.status === 'FAILED' ? 'Failed' : 'Refunded'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
