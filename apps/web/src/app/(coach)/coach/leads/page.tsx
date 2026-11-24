import { Role, formatMoney } from '@coaching/shared';
import { AddLeadSheet } from '@/components/leads/AddLeadSheet';
import { IntakeFormSheet } from '@/components/leads/IntakeFormSheet';
import { LeadBoard } from '@/components/leads/LeadBoard';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatStrip } from '@/components/ui/StatStrip';
import { leadsApi, programsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { webOrigin } from '@/lib/origin';

export default async function LeadsPage() {
  await requireUser(Role.COACH);
  const [board, form, templates, origin] = await Promise.all([
    leadsApi.board(),
    leadsApi.form(),
    programsApi.list({ template: true }),
    webOrigin(),
  ]);
  const { stats } = board;

  return (
    <>
      <PageHeader
        title="Onboarding & Lead Pipeline"
        meta={`${stats.open} active leads`}
        actions={
          <>
            <IntakeFormSheet form={form} origin={origin} />
            <AddLeadSheet />
          </>
        }
      />
      <div className="space-y-6">
        <StatStrip
          label="Pipeline"
          items={[
            { label: 'Pipeline MRR', value: formatMoney(stats.pipelineCents), emphasis: stats.pipelineCents > 0, note: 'Monthly value on open leads' },
            { label: 'Open Leads', value: String(stats.open) },
            { label: 'Call → Client Rate', value: stats.conversionPct === null ? '—' : `${stats.conversionPct}%`, delta: stats.conversionPct !== null ? { text: 'Clients out of won & lost', tone: 'good' } : null },
            { label: 'Avg Onboard Time', value: stats.avgDaysToConvert === null ? '—' : `${stats.avgDaysToConvert}d`, note: 'First contact to active' },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2.5 rounded-md border border-line bg-card px-4 py-3 text-meta text-muted">
          {form.acceptingLeads ? <Badge tone="emerald">Accepting Applications</Badge> : <Badge tone="amber">Applications Paused</Badge>}
          <span className="font-sans text-label-sm text-muted">Public intake URL:</span>
          <span className="font-mono text-label-md text-ink">{`${origin}/apply/${form.slug}`}</span>
        </div>

        {board.leads.length === 0 ? (
          <EmptyState title="No leads yet">Share your application link, or add someone by hand. Applications land in New Lead.</EmptyState>
        ) : (
          <LeadBoard leads={board.leads} templates={templates} />
        )}
      </div>
    </>
  );
}
