import { headers } from 'next/headers';
import { Feature, PlanId, Role, formatMoney, planById } from '@coaching/shared';
import { connectStripe, openBillingPortal, openStripeDashboard, startCheckout } from '@/actions/billing';
import { OfferActions } from '@/components/billing/OfferActions';
import { OfferForm } from '@/components/billing/OfferForm';
import { StripeActionButton } from '@/components/billing/StripeActionButton';
import { SubscriptionsTable } from '@/components/billing/SubscriptionsTable';
import { Badge } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatStrip } from '@/components/ui/StatStrip';
import { ToastOnMount } from '@/components/ui/ToastOnMount';
import { TABLE, TD, TD_NUM, TH, TH_NUM, THEAD, TR } from '@/components/ui/table';
import { billingApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { STATUS_LABEL, STATUS_TONE, planStateLine, seatWarning, showCoachCheckout } from '@/lib/billing';
import { firstParam } from '@/lib/form';
import { formatDate } from '@/lib/format';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Origin the client will open the copied checkout link on. */
async function webOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export default async function CoachBillingPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser(Role.COACH);
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

  return (
    <>
      {checkout === 'success' ? <ToastOnMount message="Subscribed. It can take a few seconds to show here." tone="ok" /> : null}
      {checkout === 'cancelled' ? <ToastOnMount message="Checkout cancelled. Nothing was charged." /> : null}
      {connectReturn === 'return' && !billing.connect.chargesEnabled ? (
        <ToastOnMount message="Stripe is still reviewing your details. Offers go live once charges are enabled." />
      ) : null}
      <PageHeader
        title="Billing and payments"
        meta={
          billing.connect.chargesEnabled ? (
            <Badge tone="emerald">Stripe connected</Badge>
          ) : billing.connect.connected ? (
            <Badge tone="amber">Stripe setup incomplete</Badge>
          ) : (
            <Badge>Stripe not connected</Badge>
          )
        }
        actions={<OfferForm disabledReason={offerBlock} />}
      />

      <div className="space-y-6">
        <Panel
          title="Your MUR Coaching plan"
          meta={ent.status ? <Badge tone={STATUS_TONE[ent.status]}>{STATUS_LABEL[ent.status]}</Badge> : undefined}
        >
          <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="space-y-1">
              <p className="text-ui">{planStateLine(ent)}</p>
              <p className="text-meta text-muted">
                Seats: <span className="font-mono text-ink">{ent.seatsUsed ?? 0}</span> of{' '}
                <span className="font-mono text-ink">{ent.clientLimit ?? 0}</span> (active and paused clients plus pending invites)
                {ent.hasStripeSubscription && ent.currentPeriodEnd ? ` · ${ent.cancelAtPeriodEnd ? 'Ends' : 'Renews'} ${formatDate(ent.currentPeriodEnd)}` : ''}
              </p>
              {warning ? (
                <p role="status" className="text-meta text-amber">
                  {warning}
                </p>
              ) : null}
            </div>
            {showCheckout && plan ? (
              <StripeActionButton
                action={startCheckout}
                fields={{ planId: plan.id }}
                label={`Subscribe · ${formatMoney(plan.priceCents)}/mo`}
                className="md:w-56"
                disabledReason={billing.stripeConfigured ? null : 'Payments are not configured on this server.'}
              />
            ) : ent.canManageBilling ? (
              <StripeActionButton action={openBillingPortal} label="Manage billing" variant="secondary" className="md:w-56" />
            ) : null}
          </div>
        </Panel>

        <StatStrip
          label="Client payments"
          items={[
            { label: 'Net MRR', value: formatMoney(billing.stats.mrrCents) },
            { label: 'Active subs', value: String(billing.stats.activeCount) },
            { label: 'Past due', value: String(billing.stats.pastDueCount), emphasis: billing.stats.pastDueCount > 0 },
          ]}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Panel
            title="Coaching offers"
            meta={`${liveOffers.length} live`}
            actions={
              billing.connect.connected ? (
                <StripeActionButton action={openStripeDashboard} label="Open Stripe" variant="ghost" size="sm" />
              ) : undefined
            }
          >
            {!billing.connect.chargesEnabled ? (
              <div className="space-y-3 border-b border-line p-4">
                <p className="text-ui text-muted">
                  Connect a Stripe account to get paid. Stripe collects your payout and tax details; MUR Coaching never stores card data.
                </p>
                <StripeActionButton
                  action={connectStripe}
                  label={billing.connect.connected ? 'Finish Stripe setup' : 'Connect Stripe'}
                  size="sm"
                  className="sm:w-56"
                  disabledReason={connectBlock}
                />
              </div>
            ) : null}
            {liveOffers.length === 0 ? (
              <EmptyState title="No offers yet">Create an offer, then copy its checkout link to a client.</EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {liveOffers.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-ui font-medium">{o.name}</p>
                      <p className="text-meta text-muted">
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

          <Panel title="Client payment statuses" meta="Synced from Stripe">
            {billing.subscriptions.length === 0 ? (
              <EmptyState title="No client subscriptions yet">They appear here once a client checks out.</EmptyState>
            ) : (
              <SubscriptionsTable rows={billing.subscriptions} showClient />
            )}
          </Panel>
        </div>

        {billing.payments.length > 0 ? (
          <Panel title="Recent payments" meta="Last 20">
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
                      <td className={TD}>{formatDate(p.paidAt)}</td>
                      <td className={TD}>{p.clientName}</td>
                      <td className={TD}>{p.offerName ?? '—'}</td>
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
          </Panel>
        ) : null}
      </div>
    </>
  );
}
