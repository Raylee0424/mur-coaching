'use client';

import clsx from 'clsx';
import { useActionState, useRef, useState } from 'react';
import type { CreateInviteResponse, ProgramSummaryDto, WeightUnit } from '@coaching/shared';
import { createInvite } from '@/actions/clients';
import type { ActionResult } from '@/lib/action-result';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { formatDate } from '@/lib/format';

type Delivery = 'send' | 'copy';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function InviteClientModal({ templates, label = 'Invite client' }: { templates: ProgramSummaryDto[]; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon />
        {label}
      </Button>
      {open ? <InviteSheet templates={templates} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function InviteSheet({ templates, onClose }: { templates: ProgramSummaryDto[]; onClose: () => void }) {
  const [state, action] = useActionState<ActionResult<CreateInviteResponse> | null, FormData>(createInvite, null);
  const [step, setStep] = useState<1 | 2>(1);
  const [delivery, setDelivery] = useState<Delivery>('send');
  const [unit, setUnit] = useState<WeightUnit>('KG');
  const [programId, setProgramId] = useState('');
  const [copied, setCopied] = useState<'idle' | 'ok' | 'failed'>('idle');
  const step1 = useRef<HTMLDivElement>(null);
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
      setCopied('ok');
    } catch {
      setCopied('failed');
    }
  }

  const program = templates.find((t) => t.id === programId);

  return (
    <Sheet
      open
      onClose={onClose}
      title={success ? 'Invite ready' : 'Invite new client'}
      {...(success ? {} : { description: 'Send an onboarding link or assign a starting program.' })}
    >
      {success ? (
        <div className="space-y-5">
          <div role="status" className="flex items-start gap-3 rounded-md border border-emerald/40 bg-emerald-bg p-4">
            <CheckIcon />
            <div>
              <p className="text-sm font-semibold text-emerald">
                {delivery === 'send' ? `Invite sent to ${success.invite.name}` : `Invite created for ${success.invite.name}`}
              </p>
              <p className="text-sm text-emerald/80">
                {success.invite.programName
                  ? `Assigned ${success.invite.programName}${success.invite.startDate ? ` starting ${formatDate(success.invite.startDate)}` : ''}.`
                  : 'No program assigned yet.'}{' '}
                Link expires {formatDate(success.invite.expiresAt)}.
              </p>
            </div>
          </div>
          <div>
            <Label htmlFor="invite-link">Direct onboarding link</Label>
            <div className="flex gap-2">
              <Input id="invite-link" readOnly value={success.inviteUrl} onFocus={(e) => e.currentTarget.select()} className="font-mono text-sm" />
              <Button variant="secondary" onClick={() => void copy(success.inviteUrl)}>
                {copied === 'ok' ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p role="status" className="mt-1 text-xs text-muted">
              {copied === 'failed'
                ? 'Copy failed. Select the link and copy it manually.'
                : 'Shown once. Revoke it from the pending invites list if needed.'}
            </p>
          </div>
          <footer className="flex justify-end border-t border-line pt-4">
            <Button onClick={onClose}>Done</Button>
          </footer>
        </div>
      ) : (
        <form action={action} className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Step {step} of 2</p>
          <div ref={step1} hidden={step !== 1} className="space-y-4">
            <div>
              <Label htmlFor="invite-name">Full name</Label>
              <Input id="invite-name" name="name" required maxLength={100} autoComplete="off" />
            </div>
            <div>
              <Label htmlFor="invite-email">Email address</Label>
              <Input id="invite-email" name="email" type="email" required autoComplete="off" />
            </div>
            <div>
              <Label htmlFor="invite-phone">Phone (optional)</Label>
              <Input id="invite-phone" name="phone" type="tel" maxLength={30} autoComplete="off" placeholder="+1 (555) 014-8920" />
            </div>
            <fieldset>
              <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Delivery method</legend>
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
                      'flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary',
                      delivery === value ? 'border-primary bg-primary-container text-primary' : 'border-line text-ink hover:bg-raised',
                    )}
                  >
                    <input
                      type="radio"
                      name="delivery"
                      value={value}
                      checked={delivery === value}
                      onChange={() => setDelivery(value)}
                      className="accent-primary"
                    />
                    {text}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted">
                {delivery === 'send'
                  ? 'The link is emailed to your client and shown to you here.'
                  : 'Nothing is emailed. Share the link yourself.'}
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
                <p className="mt-1 text-xs text-muted">
                  {program.durationWeeks} weeks, {program.daysPerWeek} days a week.
                </p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="invite-start">Start date</Label>
                <Input id="invite-start" name="startDate" type="date" min={todayIso()} defaultValue={todayIso()} disabled={!programId} />
              </div>
              <fieldset>
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Units</legend>
                <input type="hidden" name="weightUnit" value={unit} />
                <div className="flex gap-1 rounded-full bg-canvas-low p-1 ring-1 ring-inset ring-line">
                  {(['KG', 'LB'] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      aria-pressed={unit === u}
                      onClick={() => setUnit(u)}
                      className={clsx(
                        'min-h-9 flex-1 rounded-full text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
                        unit === u ? 'bg-primary text-primary-ink' : 'text-muted hover:text-ink',
                      )}
                    >
                      {u.toLowerCase()}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
            {templates.length === 0 ? (
              <p className="text-xs text-muted">No templates yet. Save a program as a template to assign it here.</p>
            ) : null}
          </div>

          <FormError>{state?.ok === false ? state.error : undefined}</FormError>
          <footer className="flex flex-wrap justify-between gap-2 border-t border-line pt-4">
            {step === 1 ? (
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
            )}
            {step === 1 ? (
              <Button onClick={next}>Continue</Button>
            ) : (
              <SubmitButton pendingLabel="Creating invite…">{delivery === 'send' ? 'Send invite' : 'Create link'}</SubmitButton>
            )}
          </footer>
        </form>
      )}
    </Sheet>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 size-5 shrink-0 text-emerald" fill="currentColor">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.2 14.4-4-4 1.4-1.4 2.6 2.6 5-5 1.4 1.4-6.4 6.4Z" />
    </svg>
  );
}
