import Link from 'next/link';
import { Role } from '@coaching/shared';
import type { RosterKpis } from '@coaching/shared';
import { InviteClientModal } from '@/components/clients/InviteClientModal';
import { PendingInvites } from '@/components/clients/PendingInvites';
import { RosterFilters } from '@/components/clients/RosterFilters';
import { RosterTable } from '@/components/clients/RosterTable';
import { parseRosterFilter, rosterQuery } from '@/components/clients/roster-model';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { clientsApi, programsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { firstParam } from '@/lib/form';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ClientsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser(Role.COACH);
  const params = await searchParams;
  const filter = parseRosterFilter(firstParam(params.filter));
  const q = firstParam(params.q)?.trim() ?? '';

  const [summary, invites, templates] = await Promise.all([
    clientsApi.summary(rosterQuery(filter, q)),
    clientsApi.listInvites(),
    programsApi.list({ template: true }),
  ]);
  const { counts, kpis, items } = summary;
  const total = filter === 'attention' ? counts.needsAttention : filter === 'paused' ? counts.PAUSED : filter === 'archived' ? counts.ARCHIVED : counts.ACTIVE + counts.PAUSED;
  const nobody = counts.ACTIVE + counts.PAUSED + counts.ARCHIVED === 0 && invites.length === 0;

  return (
    <>
      <PageHeader
        title="Roster overview"
        subtitle="Your clients, their adherence and what the engine wants you to review."
        actions={<InviteClientModal templates={templates} />}
      />
      <div className="space-y-6">
        {nobody ? (
          <section className="rounded-lg border border-dashed border-line bg-card px-6 py-14 text-center">
            <h2 className="font-display text-xl font-bold">No clients on your roster yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Invite your first athlete to assign a training split and let the progression engine track their last 3 sessions.
            </p>
            <div className="mt-5 flex justify-center">
              <InviteClientModal templates={templates} />
            </div>
          </section>
        ) : (
          <>
            <KpiRow kpis={kpis} />
            <RosterFilters counts={counts} filter={filter} q={q} />
            {items.length === 0 ? (
              <EmptyState title="No clients match">
                {q || filter !== 'all' ? (
                  <Link href="/coach/clients" className="font-semibold text-primary-soft underline">
                    Clear filters
                  </Link>
                ) : (
                  'Invite a client to get started.'
                )}
              </EmptyState>
            ) : (
              <RosterTable clients={items} total={total} />
            )}
          </>
        )}
        <PendingInvites invites={invites} />
      </div>
    </>
  );
}

function KpiRow({ kpis }: { kpis: RosterKpis }) {
  const cards = [
    { label: 'Active clients', value: kpis.activeClients, note: 'On your roster' },
    {
      label: 'Pending recommendations',
      value: kpis.pendingRecommendations,
      note: `Across ${kpis.pendingLifters} ${kpis.pendingLifters === 1 ? 'lifter' : 'lifters'}`,
    },
    { label: 'Sessions logged (7d)', value: kpis.sessionsLogged7d, note: 'Last 7 days' },
    { label: 'Deloads flagged', value: kpis.deloadsFlagged, note: 'Awaiting your call' },
  ];
  return (
    <section aria-label="Roster summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <article key={c.label} className="rounded-lg border border-line bg-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{c.label}</h2>
          <p className="mt-2 font-display text-3xl font-extrabold tabular-nums">{c.value}</p>
          <p className="mt-1 text-xs text-muted">{c.note}</p>
        </article>
      ))}
    </section>
  );
}
