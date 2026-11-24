'use client';

import { CalendarClock } from 'lucide-react';
import { useState } from 'react';
import { LEAD_SOURCE_LABELS, LEAD_STAGE_LABELS, formatMoney } from '@coaching/shared';
import type { LeadDto, ProgramSummaryDto } from '@coaching/shared';
import { InviteClientModal } from '@/components/clients/InviteClientModal';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { LeadSheet } from './LeadSheet';
import { ageLabel, boardColumns, leadSummary } from './leads-model';

function callLabel(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

function LeadCard({ lead, templates, onOpen }: { lead: LeadDto; templates: ProgramSummaryDto[]; onOpen: () => void }) {
  const canInvite = lead.stage !== 'ACTIVE' && lead.stage !== 'LOST';
  return (
    <li className="flex flex-col gap-2.5 rounded-sm border border-line bg-card p-3.5 transition-colors hover:bg-raised">
      <button type="button" onClick={onOpen} className="block w-full text-left focus-visible:-outline-offset-2">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0 truncate font-sans text-label-md text-ink">{lead.name}</span>
          <Badge tone="sky">{LEAD_SOURCE_LABELS[lead.source]}</Badge>
        </span>
        <span className="mt-0.5 block truncate font-sans text-label-sm font-normal text-muted">{leadSummary(lead) || lead.email}</span>
        <span className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 font-mono text-label-sm text-muted">
          <span className="text-ink">{lead.monthlyValueCents != null ? `${formatMoney(lead.monthlyValueCents)}/mo` : '—'}</span>
          <span>{ageLabel(lead.createdAt)}</span>
        </span>
        {lead.invitePending ? (
          <span className="mt-2 inline-flex">
            <Badge tone="amber">Invite pending</Badge>
          </span>
        ) : null}
        {lead.callAt && lead.stage === 'CALL_BOOKED' ? (
          <span className="mt-2 flex items-center gap-1 font-mono text-label-sm text-amber">
            <Icon icon={CalendarClock} size={14} />
            {callLabel(lead.callAt)}
          </span>
        ) : null}
      </button>
      {canInvite ? (
        <div className="pt-1">
          <InviteClientModal templates={templates} lead={lead} label={lead.invitePending ? 'Resend invite' : 'Send Invite'} variant="secondary" />
        </div>
      ) : null}
    </li>
  );
}

/** Stitch 4-column Kanban pipeline (`coach_web_onboarding_intake_lead_pipeline`). */
export function LeadBoard({ leads, templates }: { leads: LeadDto[]; templates: ProgramSummaryDto[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { columns, lost } = boardColumns(leads);
  const open = leads.find((l) => l.id === openId) ?? null;

  return (
    <>
      <div className="grid items-start gap-3.5 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => (
          <section key={col.stage} aria-label={LEAD_STAGE_LABELS[col.stage]} className="flex min-w-0 flex-col gap-3 rounded-md border border-line bg-canvas-low p-3.5">
            <div className="flex items-center justify-between px-1">
              <h2 className="font-display text-label-lg text-ink">{LEAD_STAGE_LABELS[col.stage]}</h2>
              <span className="rounded-full border border-line bg-raised px-2.5 py-0.5 font-mono text-label-sm text-muted tabular-nums">
                {col.leads.length}
              </span>
            </div>
            {col.leads.length === 0 ? (
              <p className="rounded-sm border border-dashed border-line px-3 py-6 text-center font-sans text-label-sm text-muted">
                No prospects in stage
              </p>
            ) : (
              <ul className="space-y-2.5">
                {col.leads.map((l) => (
                  <LeadCard key={l.id} lead={l} templates={templates} onOpen={() => setOpenId(l.id)} />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {lost.length > 0 ? (
        <details className="mt-6 rounded-md border border-line bg-card">
          <summary className="cursor-pointer px-4 py-3 font-sans text-label-sm uppercase tracking-wider text-muted">
            Lost ({lost.length})
          </summary>
          <ul className="divide-y divide-line border-t border-line">
            {lost.map((l) => (
              <li key={l.id}>
                <button type="button" onClick={() => setOpenId(l.id)} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-ui hover:bg-raised">
                  <span className="truncate font-medium text-ink">{l.name}</span>
                  <span className="font-mono text-label-sm text-muted">{ageLabel(l.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {open ? <LeadSheet key={open.id} lead={open} onClose={() => setOpenId(null)} /> : null}
    </>
  );
}
