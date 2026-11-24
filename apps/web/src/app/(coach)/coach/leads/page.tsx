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
  const [board, form, templates, origin] = await Promise.all([leadsApi.board(), leadsApi.form(), programsApi.list({ template: true }), webOrigin()]);
  const { stats } = board;

  return (
    <>
      <PageHeader
        title="Leads"
        meta={`${stats.open} open`}
        actions={
          <>
            <AddLeadSheet />
            <IntakeFormSheet form={form} origin={origin} />
          </>
        }
      />
      <div className="space-y-6">
        <StatStrip
          label="Pipeline"
          items={[
            { label: 'Open leads', value: String(stats.open) },
            { label: 'Pipeline MRR', value: formatMoney(stats.pipelineCents), note: 'Monthly value you set on open leads' },
            { label: 'Win rate', value: stats.conversionPct === null ? '—' : `${stats.conversionPct}%`, note: 'Clients out of won and lost' },
            { label: 'Days to convert', value: stats.avgDaysToConvert === null ? '—' : String(stats.avgDaysToConvert), note: 'Average, first contact to client' },
          ]}
        />
        <p className="flex flex-wrap items-center gap-2 text-meta text-muted">
          {form.acceptingLeads ? <Badge tone="emerald">Accepting applications</Badge> : <Badge tone="amber">Applications paused</Badge>}
          <span className="font-mono">{`${origin}/apply/${form.slug}`}</span>
        </p>
        {board.leads.length === 0 ? (
          <EmptyState title="No leads yet">Share your application link, or add someone by hand. Applications land in New lead.</EmptyState>
        ) : (
          <LeadBoard leads={board.leads} templates={templates} />
        )}
      </div>
    </>
  );
}
