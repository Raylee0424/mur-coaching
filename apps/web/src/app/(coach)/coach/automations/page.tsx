import Link from 'next/link';
import { AUTOMATION_TRIGGERS, Role } from '@coaching/shared';
import { RuleActions, RunNowButton } from '@/components/automations/RuleActions';
import { RuleEditor } from '@/components/automations/RuleEditor';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { Card, Panel } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { TABLE, TD, TH, THEAD, TR } from '@/components/ui/table';
import { automationsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';

const dateTime = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' });

export default async function AutomationsPage() {
  await requireUser(Role.COACH);
  const data = await automationsApi.overview();
  const active = data.rules.filter((r) => r.enabled).length;

  return (
    <>
      <PageHeader
        title="Automations"
        meta={`${active} active · checked every few minutes`}
        actions={
          <>
            <Link href="/coach/schedule" className={buttonClass('ghost', undefined, 'sm')}>
              Calls
            </Link>
            <RunNowButton />
            <RuleEditor />
          </>
        }
      />
      <div className="space-y-6">
        <p className="max-w-3xl text-meta text-muted">
          Deterministic triggers for onboarding, nudges and follow-ups. Each rule sends a chat message once per event, only for events after the rule was created.
        </p>
        {data.rules.length === 0 ? (
          <EmptyState title="No automations yet" action={<RuleEditor />}>
            Start with a missed-session nudge: if a planned session day ends without a log, message the client 24 hours later.
          </EmptyState>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {data.rules.map((r) => (
              <Card key={r.id} className="flex flex-col gap-3.5 p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-title-md text-ink">{r.name}</h2>
                  <Badge tone={r.enabled ? 'emerald' : 'slate'}>{r.enabled ? 'Enabled' : 'Paused'}</Badge>
                </div>
                <dl className="grid grid-cols-2 gap-2.5 text-meta">
                  <div className="rounded-sm border border-line bg-canvas-low p-3">
                    <dt className="font-sans text-label-sm uppercase tracking-wider text-primary">If trigger</dt>
                    <dd className="mt-0.5 font-sans text-label-md text-ink">
                      {AUTOMATION_TRIGGERS[r.trigger].label}
                      {r.delayHours ? ` + ${r.delayHours} h` : ''}
                    </dd>
                  </div>
                  <div className="rounded-sm border border-line bg-canvas-low p-3">
                    <dt className="font-sans text-label-sm uppercase tracking-wider text-sky">Then action</dt>
                    <dd className="mt-0.5 font-sans text-label-md text-ink">Send chat message</dd>
                  </div>
                </dl>
                <p className="line-clamp-3 whitespace-pre-wrap font-sans text-body-md text-muted">{r.messageBody}</p>
                <p className="font-mono text-label-sm text-muted">
                  {r.runsThisMonth} run{r.runsThisMonth === 1 ? '' : 's'} this month
                  {r.lastRunAt ? ` · last ${formatDate(r.lastRunAt)}` : ''}
                </p>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  <RuleActions rule={r} />
                  <RuleEditor rule={r} />
                </div>
              </Card>
            ))}
          </div>
        )}
        <Panel title="Run Log" meta={`last ${data.runs.length}`}>
          {data.runs.length === 0 ? (
            <p className="px-6 py-6 text-ui text-muted">No messages sent yet.</p>
          ) : (
            <div className="relative overflow-x-auto">
              <table className={TABLE}>
                <thead className={THEAD}>
                  <tr>
                    <th scope="col" className={TH}>When</th>
                    <th scope="col" className={TH}>Rule</th>
                    <th scope="col" className={TH}>Client</th>
                  </tr>
                </thead>
                <tbody>
                  {data.runs.map((run) => (
                    <tr key={run.id} className={TR}>
                      <td className={`${TD} font-mono text-muted`}>{dateTime(run.firedAt)}</td>
                      <td className={`${TD} font-sans text-label-md text-ink`}>{run.ruleName}</td>
                      <td className={TD}>{run.clientName}</td>
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
