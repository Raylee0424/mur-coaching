'use client';

import clsx from 'clsx';
import { ArrowRight } from 'lucide-react';
import { useActionState } from 'react';
import { Role } from '@coaching/shared';
import { demoLogin } from '@/actions/auth';
import type { ActionResult } from '@/lib/action-result';
import { FormError } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { SubmitButton } from '@/components/ui/SubmitButton';

/**
 * Two one-click demo sign-ins posting to `demoLogin` (same contract as the login page).
 * `inline` sits in the hero; `stacked` fills the nav's demo menu.
 */
export function DemoForms({ layout }: { layout: 'inline' | 'stacked' }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(demoLogin, null);
  const stacked = layout === 'stacked';
  const size = stacked ? 'md' : 'lg';
  return (
    <div className="flex flex-col gap-3">
      <div className={clsx('flex gap-4', stacked ? 'flex-col gap-2.5' : 'flex-wrap items-center pt-2')}>
        <form action={action} className={clsx(stacked && 'w-full')}>
          <input type="hidden" name="role" value={Role.COACH} />
          <SubmitButton size={size} className={clsx(stacked ? 'w-full' : 'px-6')} pendingLabel="Signing in…">
            Try Coach Demo
            <Icon icon={ArrowRight} />
          </SubmitButton>
        </form>
        <form action={action} className={clsx(stacked && 'w-full')}>
          <input type="hidden" name="role" value={Role.CLIENT} />
          <SubmitButton variant="secondary" size={size} className={clsx(stacked ? 'w-full' : 'px-6')} pendingLabel="Signing in…">
            Try Client Demo
          </SubmitButton>
        </form>
      </div>
      <FormError>{state?.ok === false ? state.error : undefined}</FormError>
    </div>
  );
}
