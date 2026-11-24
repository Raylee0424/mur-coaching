'use client';

import { ArrowRight } from 'lucide-react';
import { useActionState } from 'react';
import { Role } from '@coaching/shared';
import { demoLogin } from '@/actions/auth';
import type { ActionResult } from '@/lib/action-result';
import { FormError } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { SubmitButton } from '@/components/ui/SubmitButton';

const DEMOS = [
  { role: Role.COACH, label: 'Coach Demo', who: 'Morgan', blurb: 'Manage roster, review progression calls & deloads.' },
  { role: Role.CLIENT, label: 'Athlete Demo', who: 'Alex', blurb: 'Inspect today’s targets and log a working session.' },
] as const;

/** One-click demo sign-in cards. Both forms share one error slot. */
export function DemoLogin() {
  const [state, action] = useActionState<ActionResult | null, FormData>(demoLogin, null);
  return (
    <section aria-labelledby="demo-heading" className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <h2 id="demo-heading" className="font-sans text-label-sm uppercase tracking-wider text-muted">
          Or explore instant demo
        </h2>
        <div className="h-px flex-1 bg-line" />
      </div>
      <div className="space-y-2.5">
        {DEMOS.map((demo) => (
          <form key={demo.role} action={action}>
            <input type="hidden" name="role" value={demo.role} />
            <SubmitButton
              variant="secondary"
              size="lg"
              className="h-auto w-full justify-between rounded-md px-4 py-3 text-left hover:border-primary"
              pendingLabel="Signing in…"
            >
              <span className="min-w-0 pr-3">
                <span className="block font-display text-label-lg text-ink">{demo.label}</span>
                <span className="block whitespace-normal font-sans text-label-sm font-normal text-muted">{demo.blurb}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 font-mono text-label-sm text-primary">
                {demo.who}
                <Icon icon={ArrowRight} size={14} />
              </span>
            </SubmitButton>
          </form>
        ))}
      </div>
      <FormError>{state?.ok === false ? state.error : undefined}</FormError>
    </section>
  );
}
