'use client';

import { useActionState } from 'react';
import { Role } from '@coaching/shared';
import { demoLogin, login } from '@/actions/auth';
import type { ActionResult } from '@/lib/action-result';
import { Card } from '@/components/ui/Card';
import { FormError, Input, Label } from '@/components/ui/Field';
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
          <Card key={demo.role} className="flex flex-col gap-3">
            <p className="flex-1 text-sm text-muted">{demo.blurb}</p>
            <form action={action}>
              <input type="hidden" name="role" value={demo.role} />
              <SubmitButton className="w-full" pendingLabel="Signing in…">
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

export function EmailLogin({ next }: { next?: string }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(login, null);
  return (
    <details className="rounded-lg border border-line bg-card p-4" open={state?.ok === false}>
      <summary className="cursor-pointer text-sm font-semibold">Sign in with email</summary>
      <form action={action} className="mt-4 space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <FormError>{state?.ok === false ? state.error : undefined}</FormError>
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      </form>
    </details>
  );
}
