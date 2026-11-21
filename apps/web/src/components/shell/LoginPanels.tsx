'use client';

import { useActionState } from 'react';
import { Role } from '@coaching/shared';
import { demoLogin } from '@/actions/auth';
import type { ActionResult } from '@/lib/action-result';
import { Card } from '@/components/ui/Card';
import { FormError } from '@/components/ui/Field';
import { SubmitButton } from '@/components/ui/SubmitButton';

const DEMOS = [
  {
    role: Role.COACH,
    label: 'Demo as Coach',
    blurb: 'Morgan · two clients: one ready to add load, one plateaued and due a deload.',
  },
  {
    role: Role.CLIENT,
    label: 'Demo as Client',
    blurb: 'Alex · review your next targets and log a session.',
  },
] as const;

/** One-click recruiter demo. Both forms share one error slot. */
export function DemoLogin() {
  const [state, action] = useActionState<ActionResult | null, FormData>(demoLogin, null);
  return (
    <section aria-labelledby="demo-heading" className="space-y-3">
      <h2 id="demo-heading" className="text-sm font-semibold uppercase tracking-wide text-muted">
        Try the demo
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {DEMOS.map((demo) => (
          <Card key={demo.role} className="flex flex-col gap-3 p-4">
            <p className="flex-1 text-sm text-muted">{demo.blurb}</p>
            <form action={action}>
              <input type="hidden" name="role" value={demo.role} />
              <SubmitButton variant="secondary" className="w-full" pendingLabel="Signing in…">
                {demo.label}
              </SubmitButton>
            </form>
          </Card>
        ))}
      </div>
      <FormError>{state?.ok === false ? state.error : undefined}</FormError>
    </section>
  );
}
