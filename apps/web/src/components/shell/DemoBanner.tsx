'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Role } from '@coaching/shared';
import { onboardingFor } from '@/lib/routes';
import { demoLogin } from '@/actions/auth';
import type { ActionResult } from '@/lib/action-result';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function DemoBanner({ role }: { role: Role }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(demoLogin, null);
  const other = role === Role.COACH ? Role.CLIENT : Role.COACH;
  return (
    <div className="border-b border-primary/30 bg-primary-container px-4 py-2 text-sm text-primary-soft">
      <form action={action} className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <span>
          <strong>You&apos;re exploring demo data.</strong>
          {state?.ok === false ? <span className="ml-2 font-medium text-danger">{state.error}</span> : null}
        </span>
        <input type="hidden" name="role" value={other} />
        <span className="flex flex-wrap items-center gap-2">
          <Link href={onboardingFor(role)} className="min-h-9 rounded-full px-3 py-1.5 font-semibold underline hover:text-primary">
            View onboarding
          </Link>
          <SubmitButton variant="secondary" className="min-h-9 py-1" pendingLabel="Switching…">
            Switch to {other === Role.COACH ? 'coach' : 'client'} view
          </SubmitButton>
        </span>
      </form>
    </div>
  );
}
