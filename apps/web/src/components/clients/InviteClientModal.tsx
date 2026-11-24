'use client';

import clsx from 'clsx';
import { Copy, UserPlus } from 'lucide-react';
import { useActionState, useRef, useState } from 'react';
import type { CreateInviteResponse, LeadDto, ProgramSummaryDto, WeightUnit } from '@coaching/shared';
import { createInvite } from '@/actions/clients';
import type { ActionResult } from '@/lib/action-result';
import { Button, type ButtonVariant } from '@/components/ui/Button';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/format';

type Delivery = 'send' | 'copy';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** With `lead`, the form starts filled from the lead and the invite converts that lead when accepted. */
export function InviteClientModal({
  templates,
  label = 'Invite client',
  lead,
  variant,
}: {
  templates: ProgramSummaryDto[];
  label?: string;
  lead?: Pick<LeadDto, 'id' | 'name' | 'email' | 'phone'>;
  variant?: ButtonVariant;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant={variant} onClick={() => setOpen(true)}>
        <Icon icon={UserPlus} />
        {label}
      </Button>
      {open ? <InviteSheet templates={templates} lead={lead} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function InviteSheet({ templates, lead, onClose }: { templates: ProgramSummaryDto[]; lead?: Pick<LeadDto, 'id' | 'name' | 'email' | 'phone'>; onClose: () => void }) {
  const [state, action] = useActionState<ActionResult<CreateInviteResponse> | null, FormData>(createInvite, null);
  const [step, setStep] = useState<1 | 2>(1);
  const [delivery, setDelivery] = useState<Delivery>('send');
  const [unit, setUnit] = useState<WeightUnit>('KG');
  const [programId, setProgramId] = useState('');
  const [copyFailed, setCopyFailed] = useState(false);
  const step1 = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const success = state?.ok ? state.data : null;

  function next(): void {
    const fields = step1.current?.querySelectorAll<HTMLInputElement>('input');
    for (const f of fields ?? []) {
      if (!f.checkValidity()) {
        f.reportValidity();
        return;
      }
    }
    setStep(2);
  }

  async function copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFailed(false);
      toast.show({ message: 'Invite link copied', tone: 'ok' });
    } catch {
      setCopyFailed(true);
    }
  }

  const program = templates.find((t) => t.id === programId);

  if (success) {
    return (
      <Sheet
        open
        onClose={onClose}
        title="Invite ready"
        footer={
          <>
            <span />
            <Button onClick={onClose}>Done</Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="border-l-2 border-l-emerald bg-emerald-bg px-3 py-2">
            <p className="text-ui font-medium text-emerald">
              {delivery === 'send' ? `Invite sent to ${success.invite.name}` : `Invite created for ${success.invite.name}`}
            </p>
            <p className="mt-0.5 text-meta text-muted">
              {success.invite.programName
                ? `Assigned ${success.invite.programName}${success.invite.startDate ? ` starting ${formatDate(success.invite.startDate)}` : ''}.`
                : 'No program assigned yet.'}{' '}
              Link expires {formatDate(success.invite.expiresAt)}.
            </p>
          </div>
          <div>
            <Label htmlFor="invite-link">Direct onboarding link</Label>
            <div className="flex gap-2">
              <Input id="invite-link" readOnly value={success.inviteUrl} onFocus={(e) => e.currentTarget.select()} className="font-mono" />
              <Button variant="secondary" aria-label="Copy invite link" className="w-9 shrink-0 px-0" onClick={() => void copy(success.inviteUrl)}>
                <Icon icon={Copy} />
              </Button>
            </div>
            <p className="mt-1 text-meta text-muted">
              {copyFailed ? 'Copy failed. Select the link and copy it manually.' : 'Shown once. Revoke it from the pending invites list if needed.'}
            </p>
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Invite new client"
      description="Send an onboarding link or assign a starting program."
      form={{ action, className: 'space-y-0' }}
      footer={
        <>
          {step === 1 ? (
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
          )}
          {step === 1 ? (
            <Button onClick={next}>Continue</Button>
          ) : (
            <SubmitButton pendingLabel="Creating invite…">{delivery === 'send' ? 'Send invite' : 'Create link'}</SubmitButton>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <p className="font-mono text-micro uppercase text-muted">
          Step {step} / 2
        </p>
        <div ref={step1} hidden={step !== 1} className="space-y-4">
          {lead ? <input type="hidden" name="leadId" value={lead.id} /> : null}
          <div>
            <Label htmlFor="invite-name">Full name</Label>
            <Input id="invite-name" name="name" required maxLength={100} autoComplete="off" defaultValue={lead?.name} />
          </div>
          <div>
            <Label htmlFor="invite-email">Email address</Label>
            <Input id="invite-email" name="email" type="email" required autoComplete="off" defaultValue={lead?.email} />
          </div>
          <div>
            <Label htmlFor="invite-phone">Phone (optional)</Label>
            <Input id="invite-phone" name="phone" type="tel" maxLength={30} autoComplete="off" placeholder="+1 (555) 014-8920" defaultValue={lead?.phone ?? undefined} />
          </div>
          <fieldset>
            <legend className="mb-1.5 font-mono text-micro uppercase text-muted">Delivery method</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['send', 'Send invite link'],
                  ['copy', 'Copy link'],
                ] as const
              ).map(([value, text]) => (
                <label
                  key={value}
                  className={clsx(
                    'flex h-9 cursor-pointer items-center gap-2 rounded border px-3 text-ui has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal',
                    delivery === value ? 'border-ink bg-raised text-ink' : 'border-line-strong text-muted hover:text-ink',
                  )}
                >
                  <input type="radio" name="delivery" value={value} checked={delivery === value} onChange={() => setDelivery(value)} />
                  {text}
                </label>
              ))}
            </div>
            <p className="mt-1 text-meta text-muted">
              {delivery === 'send' ? 'The link is emailed to your client and shown to you here.' : 'Nothing is emailed. Share the link yourself.'}
            </p>
          </fieldset>
        </div>

        <div hidden={step !== 2} className="space-y-4">
          <div>
            <Label htmlFor="invite-program">Assign program</Label>
            <Select id="invite-program" name="programId" value={programId} onChange={(e) => setProgramId(e.target.value)}>
              <option value="">Start blank</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Template)
                </option>
              ))}
            </Select>
            {program ? (
              <p className="mt-1 text-meta text-muted">
                <span className="font-mono">{program.durationWeeks}</span> weeks, <span className="font-mono">{program.daysPerWeek}</span> days a week.
              </p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="invite-start">Start date</Label>
              <Input id="invite-start" name="startDate" type="date" min={todayIso()} defaultValue={todayIso()} disabled={!programId} className="font-mono" />
            </div>
            <fieldset>
              <legend className="mb-1.5 font-mono text-micro uppercase text-muted">Units</legend>
              <input type="hidden" name="weightUnit" value={unit} />
              <div className="flex gap-0.5 rounded border border-line bg-canvas-low p-0.5">
                {(['KG', 'LB'] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    aria-pressed={unit === u}
                    onClick={() => setUnit(u)}
                    className={clsx(
                      'h-8 flex-1 rounded-sm font-mono text-micro uppercase',
                      unit === u ? 'bg-raised text-ink' : 'text-muted hover:text-ink',
                    )}
                  >
                    {u.toLowerCase()}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          {templates.length === 0 ? (
            <p className="text-meta text-muted">No templates yet. Save a program as a template to assign it here.</p>
          ) : null}
        </div>

        <FormError>{state?.ok === false ? state.error : undefined}</FormError>
      </div>
    </Sheet>
  );
}
