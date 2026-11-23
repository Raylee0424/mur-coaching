'use client';

import { useActionState } from 'react';
import { Role } from '@coaching/shared';
import { demoLogin } from '@/actions/auth';
import type { ActionResult } from '@/lib/action-result';
import { FormError } from '@/components/ui/Field';
import { SubmitButton } from '@/components/ui/SubmitButton';

const DEMOS = [
  { role: Role.COACH, label: 'Coach demo', who: 'Morgan', blurb: 'Two clients: one ready to add load, one due a deload.' },
  { role: Role.CLIENT, label: 'Client demo', who: 'Alex', blurb: 'Review your next targets and log a session.' },
] as const;

/** One-click demo sign-in. Both forms share one error slot. */
export function DemoLogin() {
  const [state, action] = useActionState<ActionResult | null, FormData>(demoLogin, null);
  return (
    <section aria-labelledby="demo-heading" className="space-y-3">
      <h2 id="demo-heading" className="font-mono text-micro uppercase text-muted" style={{ fontStretch: '100%', letterSpacing: '0.06em' }}>
        Try the demo
      </h2>
      <div className="space-y-2">
        {DEMOS.map((demo) => (
          <form key={demo.role} action={action}>
            <input type="hidden" name="role" value={demo.role} />
            <SubmitButton variant="secondary" size="lg" className="h-auto w-full justify-between py-2.5 text-left" pendingLabel="Signing in…">
              <span>
                <span className="block text-ui font-medium">{demo.label}</span>
                <span className="block whitespace-normal text-meta font-normal text-muted">{demo.blurb}</span>
              </span>
              <span className="font-mono text-micro uppercase text-faint">demo · {demo.who}</span>
            </SubmitButton>
          </form>
        ))}
      </div>
      <FormError>{state?.ok === false ? state.error : undefined}</FormError>
    </section>
  );
}
