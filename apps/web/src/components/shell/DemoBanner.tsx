'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Role } from '@coaching/shared';
import { onboardingFor } from '@/lib/routes';
import { demoLogin } from '@/actions/auth';
import type { ActionResult } from '@/lib/action-result';
import { buttonClass } from '@/components/ui/Button';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function DemoBanner({ role }: { role: Role }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(demoLogin, null);
  const other = role === Role.COACH ? Role.CLIENT : Role.COACH;
  return (
    <div className="border-b border-line bg-canvas-low px-4 text-meta text-muted">
      <form action={action} className="flex min-h-9 flex-wrap items-center justify-between gap-2 py-1">
        <span className="flex items-center gap-2">
          <span className="font-mono text-micro uppercase text-signal">Demo</span>
          Seeded data.
          {state?.ok === false ? <span className="font-medium text-danger">{state.error}</span> : null}
        </span>
        <input type="hidden" name="role" value={other} />
        <span className="flex items-center gap-2">
          <Link href={onboardingFor(role)} className={buttonClass('ghost', undefined, 'sm')}>
            View onboarding
          </Link>
          <SubmitButton variant="secondary" size="sm" pendingLabel="Switching…">
            Switch to {other === Role.COACH ? 'coach' : 'client'}
          </SubmitButton>
        </span>
      </form>
    </div>
  );
}
