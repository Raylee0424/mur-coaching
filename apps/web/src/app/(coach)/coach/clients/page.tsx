import Link from 'next/link';
import { Role } from '@coaching/shared';
import type { RosterKpis } from '@coaching/shared';
import { InviteClientModal } from '@/components/clients/InviteClientModal';
import { PendingInvites } from '@/components/clients/PendingInvites';
import { RosterFilters } from '@/components/clients/RosterFilters';
import { RosterTable } from '@/components/clients/RosterTable';
import { parseRosterFilter, rosterMeta, rosterQuery } from '@/components/clients/roster-model';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatStrip, type StatItem } from '@/components/ui/StatStrip';
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
      <PageHeader title="Roster" meta={rosterMeta(counts)} actions={<InviteClientModal templates={templates} />} />
      <div className="space-y-6">
        {nobody ? (
          <EmptyState title="No clients yet" action={<InviteClientModal templates={templates} />}>
            Invite an athlete, assign a program, and the engine starts after their first logged sessions.
          </EmptyState>
        ) : (
          <>
            <StatStrip label="Roster summary" items={kpiItems(kpis)} dense />
            {items.length === 0 ? (
              <>
                <RosterFilters counts={counts} filter={filter} q={q} />
                <EmptyState title="No clients match">
                  {q || filter !== 'all' ? (
                    <Link href="/coach/clients" className="text-ink underline">
                      Clear filters
                    </Link>
                  ) : (
                    'Invite a client to get started.'
                  )}
                </EmptyState>
              </>
            ) : (
              <RosterTable clients={items} total={total} toolbar={<RosterFilters counts={counts} filter={filter} q={q} />} />
            )}
          </>
        )}
        <PendingInvites invites={invites} />
      </div>
    </>
  );
}

function kpiItems(kpis: RosterKpis): StatItem[] {
  return [
    { label: 'Active clients', value: String(kpis.activeClients) },
    {
      label: 'Targets to review',
      value: String(kpis.pendingRecommendations),
      emphasis: kpis.pendingRecommendations > 0,
      note: `across ${kpis.pendingLifters} ${kpis.pendingLifters === 1 ? 'lifter' : 'lifters'}`,
    },
    { label: 'Sessions logged · 7d', value: String(kpis.sessionsLogged7d) },
    {
      label: 'Lighter weeks flagged',
      value: String(kpis.deloadsFlagged),
      delta: kpis.deloadsFlagged > 0 ? { text: 'awaiting review', tone: 'bad' } : null,
    },
  ];
}
