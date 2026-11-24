import { formatMoney, type ClientSubscriptionDto } from '@coaching/shared';
import { Badge } from '@/components/ui/Badge';
import { TABLE, TD, TD_NUM, TH, TH_NUM, THEAD, TR } from '@/components/ui/table';
import { STATUS_LABEL, STATUS_TONE } from '@/lib/billing';
import { formatDate } from '@/lib/format';

/** Offer subscriptions. Coaches see a Client column; clients see only their own rows. */
export function SubscriptionsTable({ rows, showClient }: { rows: readonly ClientSubscriptionDto[]; showClient: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className={TABLE}>
        <thead className={THEAD}>
          <tr>
            {showClient ? <th scope="col" className={TH}>Client</th> : null}
            <th scope="col" className={TH}>Offer</th>
            <th scope="col" className={TH_NUM}>Amount</th>
            <th scope="col" className={TH}>Status</th>
            <th scope="col" className={TH}>Next billing</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className={TR}>
              {showClient ? <td className={TD}>{s.clientName}</td> : null}
              <td className={TD}>{s.offerName}</td>
              <td className={TD_NUM}>{formatMoney(s.amountCents, s.currency)}</td>
              <td className={TD}>
                <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
              </td>
              <td className={`${TD} text-muted`}>
                {s.status === 'CANCELED' || !s.currentPeriodEnd
                  ? '—'
                  : s.cancelAtPeriodEnd
                    ? `Ends ${formatDate(s.currentPeriodEnd)}`
                    : formatDate(s.currentPeriodEnd)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
