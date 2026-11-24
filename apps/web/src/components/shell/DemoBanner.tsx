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
      <form action={action} className="flex min-h-10 flex-wrap items-center justify-between gap-2 py-1.5">
        <span className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary-container px-2.5 py-0.5 font-sans text-label-sm uppercase text-primary">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            Demo
          </span>
          <span>Exploring seeded data.</span>
          {state?.ok === false ? <span className="font-medium text-danger">{state.error}</span> : null}
        </span>
        <input type="hidden" name="role" value={other} />
        <span className="flex items-center gap-2">
          <Link href={onboardingFor(role)} className={buttonClass('ghost', undefined, 'sm')}>
            View onboarding
          </Link>
          <SubmitButton variant="secondary" size="sm" pendingLabel="Switching…">
            Switch to {other === Role.COACH ? 'Coach' : 'Athlete'}
          </SubmitButton>
        </span>
      </form>
    </div>
  );
}
