'use client';

import clsx from 'clsx';
import { LayoutDashboard, Smartphone, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useId, useState } from 'react';
import { Role } from '@coaching/shared';
import { signup } from '@/actions/auth';
import type { ActionResult } from '@/lib/action-result';
import { FormError, Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { PasswordMeter } from './PasswordMeter';

const ROLES: readonly { role: Role; title: string; blurb: string; icon: LucideIcon }[] = [
  { role: Role.COACH, title: 'I’m a Coach', blurb: 'Manage rosters and set progression rules', icon: LayoutDashboard },
  { role: Role.CLIENT, title: 'I’m a Client', blurb: 'Log sets and see your next target', icon: Smartphone },
];

export function SignupForm() {
  const id = useId();
  const [state, action] = useActionState<ActionResult | null, FormData>(signup, null);
  const [role, setRole] = useState<Role>(Role.COACH);
  const [password, setPassword] = useState('');

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="role" value={role} />
      <div role="radiogroup" aria-label="Account role" className="grid grid-cols-2 gap-3">
        {ROLES.map((r) => {
          const on = role === r.role;
          return (
            <button
              key={r.role}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setRole(r.role)}
              className={clsx(
                'flex flex-col gap-2 rounded-md p-4 text-left transition-colors',
                on ? 'border-2 border-primary bg-card' : 'border border-line bg-canvas-low hover:border-line-strong',
              )}
            >
              <span className={on ? 'text-primary' : 'text-muted'}>
                <Icon icon={r.icon} size={20} />
              </span>
              <span>
                <span className="block font-display text-label-lg text-ink">{r.title}</span>
                <span className="mt-0.5 block font-sans text-label-sm font-normal text-muted">{r.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div>
        <Label htmlFor={`${id}-name`}>Full name</Label>
        <Input size="lg" id={`${id}-name`} name="name" autoComplete="name" required maxLength={100} placeholder="Alex Morgan" />
      </div>
      <div>
        <Label htmlFor={`${id}-email`}>Email</Label>
        <Input size="lg" id={`${id}-email`} name="email" type="email" autoComplete="email" required placeholder="alex@murcoaching.io" />
      </div>
      <div>
        <Label htmlFor={`${id}-pw`}>Password</Label>
        <PasswordInput
          size="lg"
          id={`${id}-pw`}
          name="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
        />
        <PasswordMeter password={password} />
      </div>
      <label className="flex cursor-pointer items-start gap-2.5 font-sans text-label-md font-normal text-muted">
        <input type="checkbox" name="terms" required className="mt-0.5 size-4 shrink-0 rounded border-line bg-canvas-low" />
        <span>I agree to the Terms of Service and Privacy Policy.</span>
      </label>
      <FormError>{state?.ok === false ? state.error : undefined}</FormError>
      <SubmitButton size="lg" className="w-full" pendingLabel="Creating account…">
        Create Account
      </SubmitButton>
      <p className="text-center font-sans text-body-md text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-sans text-label-lg text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
