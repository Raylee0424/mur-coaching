'use client';

import type { AutomationCandidateDto, AutomationRuleDto } from '@coaching/shared';
import { Play, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { deleteAutomationRule, dryRunAutomation, runAutomationsNow, saveAutomationRule } from '@/actions/automations';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/format';

export function RuleActions({ rule }: { rule: AutomationRuleDto }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<AutomationCandidateDto[] | null>(null);

  const toggle = () =>
    start(async () => {
      const { name, trigger, delayHours, messageBody } = rule;
      const res = await saveAutomationRule(rule.id, { name, trigger, delayHours, messageBody, enabled: !rule.enabled });
      if (!res.ok) toast.show({ message: res.error, tone: 'error' });
    });
  const remove = () => {
    if (!window.confirm(`Delete "${rule.name}"? Its run history goes with it.`)) return;
    start(async () => {
      const res = await deleteAutomationRule(rule.id);
      toast.show(res.ok ? { message: 'Rule deleted', tone: 'ok' } : { message: res.error, tone: 'error' });
    });
  };
  const dryRun = () =>
    start(async () => {
      const res = await dryRunAutomation(rule.id);
      if (res.ok) setPreview(res.data);
      else toast.show({ message: res.error, tone: 'error' });
    });

  return (
    <div className="flex flex-wrap items-center gap-1">
      <label className="mr-2 flex min-h-9 items-center gap-2 text-ui">
        <input type="checkbox" role="switch" checked={rule.enabled} onChange={toggle} disabled={pending} className="size-4" />
        {rule.enabled ? 'Enabled' : 'Paused'}
      </label>
      <Button size="sm" variant="ghost" onClick={dryRun} disabled={pending}>
        Dry run
      </Button>
      <Button size="sm" variant="ghost" onClick={remove} disabled={pending} aria-label={`Delete ${rule.name}`}>
        <Icon icon={Trash2} />
      </Button>
      <Sheet open={preview !== null} onClose={() => setPreview(null)} title={`Dry run: ${rule.name}`} description="What this rule would send right now. Nothing was sent.">
        {preview?.length ? (
          <ul className="divide-y divide-line">
            {preview.map((c) => (
              <li key={`${c.clientId}-${c.subject}`} className="py-2 text-ui">
                <span className="font-medium">{c.clientName}</span> <span className="text-muted">· {c.subject} · due {formatDate(c.dueAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ui text-muted">Nothing is due. The rule would send no messages now.</p>
        )}
      </Sheet>
    </div>
  );
}

export function RunNowButton() {
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      aria-busy={pending}
      onClick={() =>
        start(async () => {
          const res = await runAutomationsNow();
          toast.show(res.ok ? { message: res.data.sent ? `Sent ${res.data.sent} message${res.data.sent === 1 ? '' : 's'}` : 'Nothing was due', tone: 'ok' } : { message: res.error, tone: 'error' });
        })
      }
    >
      <Icon icon={Play} />
      Run now
    </Button>
  );
}
