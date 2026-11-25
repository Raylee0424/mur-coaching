'use client';

import { useActionState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { Role } from '@coaching/shared';
import { demoLogin } from '@/actions/auth';
import type { ActionResult } from '@/lib/action-result';
import { Icon } from '@/components/ui/Icon';
import { SubmitButton } from '@/components/ui/SubmitButton';

/** Demo marker that lives in the brand bar: a "Demo" pill with a one-tap role switch. */
export function DemoPill({ role }: { role: Role }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(demoLogin, null);
  const other = role === Role.COACH ? Role.CLIENT : Role.COACH;
  const otherLabel = other === Role.COACH ? 'Coach' : 'Athlete';
  return (
    <form action={action} className="flex min-w-0 flex-col items-start gap-1">
      <input type="hidden" name="role" value={other} />
      <span className="inline-flex max-w-full items-center rounded-full border border-primary/40 bg-primary-container p-0.5 pl-2.5">
        <span className="inline-flex items-center gap-1.5 font-sans text-label-sm uppercase text-primary">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
          Demo
        </span>
        <SubmitButton
          variant="ghost"
          size="sm"
          pendingLabel="Switching…"
          aria-label={`Demo data. Switch to ${otherLabel}`}
          className="ml-1.5"
        >
          <Icon icon={ArrowLeftRight} size={14} />
          {otherLabel}
        </SubmitButton>
      </span>
      {state?.ok === false ? (
        <span role="alert" className="text-label-sm text-danger">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
