'use client';

import { AUTOMATION_LIMITS, AUTOMATION_TRIGGERS, AutomationTrigger } from '@coaching/shared';
import type { AutomationRuleDto } from '@coaching/shared';
import { Plus } from 'lucide-react';
import { useState, useTransition } from 'react';
import { saveAutomationRule } from '@/actions/automations';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';

/** Create (no `rule`) or edit an IF trigger THEN message rule. */
export function RuleEditor({ rule }: { rule?: AutomationRuleDto }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<AutomationTrigger>(rule?.trigger ?? AutomationTrigger.SESSION_MISSED);
  const [delay, setDelay] = useState(String(rule?.delayHours ?? AUTOMATION_TRIGGERS.SESSION_MISSED.defaultDelayHours));
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function submit(form: FormData): void {
    setError(undefined);
    const delayHours = Number(delay);
    if (!Number.isInteger(delayHours) || delayHours < 0 || delayHours > AUTOMATION_LIMITS.maxDelayHours) return setError(`Delay is a whole number of hours, 0 to ${AUTOMATION_LIMITS.maxDelayHours}.`);
    const input = {
      name: String(form.get('name') ?? '').trim(),
      trigger,
      delayHours,
      messageBody: String(form.get('body') ?? '').trim(),
      enabled: form.get('enabled') === 'on',
    };
    if (!input.name || !input.messageBody) return setError('Give the rule a name and a message.');
    start(async () => {
      const res = await saveAutomationRule(rule?.id ?? null, input);
      if (!res.ok) return setError(res.error);
      toast.show({ message: rule ? 'Rule saved' : 'Rule created', tone: 'ok' });
      setOpen(false);
    });
  }

  return (
    <>
      {rule ? (
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          Edit rule
        </Button>
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}>
          <Icon icon={Plus} />
          New automation
        </Button>
      )}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        variant="drawer"
        title={rule ? 'Edit automation' : 'New automation'}
        description="Rules only act on events that happen after the rule exists, and each event fires once."
        form={{ action: submit }}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} aria-busy={pending}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="ar-name">Name</Label>
            <Input id="ar-name" name="name" required maxLength={AUTOMATION_LIMITS.maxName} defaultValue={rule?.name} placeholder="Missed session check-in" />
          </div>
          <div>
            <Label htmlFor="ar-trigger">If</Label>
            <Select
              id="ar-trigger"
              value={trigger}
              onChange={(e) => {
                const t = e.target.value as AutomationTrigger;
                setTrigger(t);
                setDelay(String(AUTOMATION_TRIGGERS[t].defaultDelayHours));
              }}
            >
              {Object.values(AutomationTrigger).map((t) => (
                <option key={t} value={t}>
                  {AUTOMATION_TRIGGERS[t].label}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-meta text-muted">Fires when {AUTOMATION_TRIGGERS[trigger].event}.</p>
          </div>
          <div>
            <Label htmlFor="ar-delay">Wait (hours)</Label>
            <Input id="ar-delay" type="number" min={0} max={AUTOMATION_LIMITS.maxDelayHours} step={1} value={delay} onChange={(e) => setDelay(e.target.value)} className="w-28" />
          </div>
          <div>
            <Label htmlFor="ar-body">Then send this chat message</Label>
            <textarea
              id="ar-body"
              name="body"
              required
              rows={5}
              maxLength={AUTOMATION_LIMITS.maxBody}
              defaultValue={rule?.messageBody}
              placeholder="Hey {firstName}, saw yesterday's session didn't get logged. Travelling? Reply and I'll send a hotel-gym swap."
              className="block w-full rounded border border-line-strong bg-canvas-low px-3 py-2 text-ui text-ink placeholder:text-faint hover:border-faint"
            />
            <p className="mt-1 text-meta text-muted">
              Placeholders: <code>{'{firstName}'}</code>, <code>{'{coachName}'}</code>. Sent as you, in the client&apos;s message thread.
            </p>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-ui">
            <input type="checkbox" name="enabled" defaultChecked={rule?.enabled ?? true} className="size-4" />
            Enabled
          </label>
          <FormError>{error}</FormError>
        </div>
      </Sheet>
    </>
  );
}
