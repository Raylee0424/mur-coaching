'use client';

import clsx from 'clsx';
import { useActionState } from 'react';
import { Role } from '@coaching/shared';
import { demoLogin } from '@/actions/auth';
import type { ActionResult } from '@/lib/action-result';
import { FormError } from '@/components/ui/Field';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { ArrowRightIcon } from './Icons';

/**
 * Two one-click demo sign-ins posting to `demoLogin` (same contract as the login page).
 * `inline` sits in the hero; `stacked` fills the nav's "Try Live Demo" menu.
 */
export function DemoForms({ layout }: { layout: 'inline' | 'stacked' }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(demoLogin, null);
  const stacked = layout === 'stacked';
  return (
    <div className="flex flex-col gap-3">
      <div className={clsx('flex gap-3', stacked ? 'flex-col' : 'flex-wrap items-center sm:gap-4')}>
        <form action={action} className={clsx(stacked && 'w-full')}>
          <input type="hidden" name="role" value={Role.COACH} />
          <SubmitButton className={clsx(stacked && 'w-full')} pendingLabel="Signing in…">
            Try Coach Demo
            <ArrowRightIcon className="size-4" />
          </SubmitButton>
        </form>
        <form action={action} className={clsx(stacked && 'w-full')}>
          <input type="hidden" name="role" value={Role.CLIENT} />
          <SubmitButton variant="secondary" className={clsx(stacked && 'w-full')} pendingLabel="Signing in…">
            Try Client Demo
          </SubmitButton>
        </form>
      </div>
      <FormError>{state?.ok === false ? state.error : undefined}</FormError>
    </div>
  );
}
