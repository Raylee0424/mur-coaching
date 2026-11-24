'use client';

import { Trash2 } from 'lucide-react';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { LEAD_SOURCE_LABELS, LEAD_STAGE_LABELS } from '@coaching/shared';
import type { LeadDto, LeadStage } from '@coaching/shared';
import { deleteLead, moveLead, saveLeadDetails } from '@/actions/leads';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/format';
import { leadSummary, movableStages } from './leads-model';

/** `datetime-local` wants the viewer's wall time, not UTC. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LeadSheet({ lead, onClose }: { lead: LeadDto; onClose: () => void }) {
  const toast = useToast();
  const [state, action] = useActionState(saveLeadDetails, null);
  const [pending, startTransition] = useTransition();
  const [callLocal, setCallLocal] = useState(toLocalInput(lead.callAt));
  const stages = movableStages(lead.stage);

  useEffect(() => {
    if (state?.ok) toast.show({ message: 'Lead saved', tone: 'ok' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to a new result only
  }, [state]);

  function move(stage: LeadStage): void {
    startTransition(async () => {
      const result = await moveLead(lead.id, stage);
      toast.show(result.ok ? { message: `Moved to ${LEAD_STAGE_LABELS[stage]}`, tone: 'ok' } : { message: result.error, tone: 'error' });
    });
  }

  function remove(): void {
    if (!window.confirm(`Delete ${lead.name}? Their intake answers go with them.`)) return;
    startTransition(async () => {
      const result = await deleteLead(lead.id);
      if (result.ok) onClose();
      else toast.show({ message: result.error, tone: 'error' });
    });
  }

  return (
    <Sheet
      open
      onClose={onClose}
      variant="drawer"
      title={lead.name}
      description={leadSummary(lead) || 'No goal given'}
      headerExtra={
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge>{LEAD_SOURCE_LABELS[lead.source]}</Badge>
          {lead.invitePending ? <Badge tone="sky">Invite pending</Badge> : null}
          {lead.convertedAt ? <Badge tone="emerald">Client since {formatDate(lead.convertedAt)}</Badge> : null}
        </div>
      }
      form={{ action }}
      footer={
        <>
          <Button variant="ghost" onClick={remove} disabled={pending} aria-label={`Delete ${lead.name}`}>
            <Icon icon={Trash2} />
            Delete
          </Button>
          <SubmitButton pendingLabel="Saving…">Save details</SubmitButton>
        </>
      }
    >
      <div className="space-y-5">
        <input type="hidden" name="id" value={lead.id} />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-ui">
          <dt className="font-mono text-micro uppercase text-muted">Email</dt>
          <dd className="break-all">{lead.email}</dd>
          {lead.phone ? (
            <>
              <dt className="font-mono text-micro uppercase text-muted">Phone</dt>
              <dd>{lead.phone}</dd>
            </>
          ) : null}
        </dl>

        <div>
          <Label htmlFor="lead-stage">Stage</Label>
          {stages.length === 0 ? (
            <p className="text-ui">{LEAD_STAGE_LABELS[lead.stage]}</p>
          ) : (
            <Select id="lead-stage" value={lead.stage} disabled={pending} onChange={(e) => move(e.target.value as LeadStage)}>
              {stages.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STAGE_LABELS[s]}
                </option>
              ))}
            </Select>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="lead-detail-value">Monthly value (USD)</Label>
            <Input
              id="lead-detail-value"
              name="value"
              inputMode="decimal"
              defaultValue={lead.monthlyValueCents != null ? String(lead.monthlyValueCents / 100) : ''}
              placeholder="320"
            />
          </div>
          <div>
            <Label htmlFor="lead-call">Call time</Label>
            <Input id="lead-call" name="callAt" type="datetime-local" value={callLocal} onChange={(e) => setCallLocal(e.target.value)} className="font-mono" />
            <input type="hidden" name="callAtIso" value={callLocal ? new Date(callLocal).toISOString() : ''} />
          </div>
        </div>

        <div>
          <Label htmlFor="lead-notes">Notes (private)</Label>
          <textarea
            id="lead-notes"
            name="notes"
            maxLength={2000}
            rows={4}
            defaultValue={lead.notes ?? ''}
            className="block w-full rounded border border-line-strong bg-canvas-low px-3 py-2 text-ui text-ink placeholder:text-faint hover:border-faint"
          />
        </div>

        <section aria-label="Intake answers">
          <h3 className="mb-2 font-mono text-micro uppercase text-muted">Intake answers</h3>
          {lead.answers.length === 0 ? (
            <p className="text-meta text-muted">No custom answers. They came in {lead.source === 'MANUAL' ? 'by hand' : 'without extra questions'}.</p>
          ) : (
            <dl className="space-y-3">
              {lead.answers.map((a) => (
                <div key={a.question}>
                  <dt className="text-meta text-muted">{a.question}</dt>
                  <dd className="whitespace-pre-wrap text-ui">{a.answer}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
        <FormError>{state && !state.ok ? state.error : undefined}</FormError>
      </div>
    </Sheet>
  );
}
