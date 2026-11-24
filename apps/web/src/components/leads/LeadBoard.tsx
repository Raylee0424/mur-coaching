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
    <li className="rounded border border-line bg-card">
      <button type="button" onClick={onOpen} className="block w-full px-3 pt-3 text-left focus-visible:-outline-offset-2">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0 truncate text-ui font-medium">{lead.name}</span>
          <span className="shrink-0 font-mono text-micro text-faint">{ageLabel(lead.createdAt)}</span>
        </span>
        <span className="mt-0.5 block truncate text-meta text-muted">{leadSummary(lead) || lead.email}</span>
        <span className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge>{LEAD_SOURCE_LABELS[lead.source]}</Badge>
          {lead.invitePending ? <Badge tone="sky">Invite pending</Badge> : null}
          {lead.monthlyValueCents != null ? <span className="font-mono text-meta text-ink">{formatMoney(lead.monthlyValueCents)}/mo</span> : null}
        </span>
        {lead.callAt && lead.stage === 'CALL_BOOKED' ? (
          <span className="mt-2 flex items-center gap-1 font-mono text-meta text-amber">
            <Icon icon={CalendarClock} size={14} />
            {callLabel(lead.callAt)}
          </span>
        ) : null}
      </button>
      <div className="flex min-h-11 items-center px-2 pb-2 pt-2">
        {canInvite ? (
          <InviteClientModal templates={templates} lead={lead} label={lead.invitePending ? 'Resend invite' : 'Invite'} variant="secondary" />
        ) : null}
      </div>
    </li>
  );
}

/** Four-column pipeline. Stages change from each lead's detail sheet; ACTIVE is set by invite acceptance. */
export function LeadBoard({ leads, templates }: { leads: LeadDto[]; templates: ProgramSummaryDto[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { columns, lost } = boardColumns(leads);
  const open = leads.find((l) => l.id === openId) ?? null;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => (
          <section key={col.stage} aria-label={LEAD_STAGE_LABELS[col.stage]} className="min-w-0">
            <h2 className="mb-2 flex items-baseline justify-between border-b border-line pb-2 font-mono text-micro uppercase text-muted">
              {LEAD_STAGE_LABELS[col.stage]}
              <span className="text-faint">{col.leads.length}</span>
            </h2>
            {col.leads.length === 0 ? (
              <p className="rounded border border-dashed border-line px-3 py-6 text-meta text-faint">Nobody here.</p>
            ) : (
              <ul className="space-y-2">
                {col.leads.map((l) => (
                  <LeadCard key={l.id} lead={l} templates={templates} onOpen={() => setOpenId(l.id)} />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {lost.length > 0 ? (
        <details className="mt-8 rounded border border-line">
          <summary className="cursor-pointer px-4 py-3 font-mono text-micro uppercase text-muted">Lost ({lost.length})</summary>
          <ul className="divide-y divide-line border-t border-line">
            {lost.map((l) => (
              <li key={l.id}>
                <button type="button" onClick={() => setOpenId(l.id)} className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-ui hover:bg-raised">
                  <span className="truncate">{l.name}</span>
                  <span className="font-mono text-micro text-faint">{ageLabel(l.createdAt)}</span>
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
