'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useActionState, useId, useState } from 'react';
import { Role } from '@coaching/shared';
import { signup } from '@/actions/auth';
import type { ActionResult } from '@/lib/action-result';
import { FormError, Input, Label } from '@/components/ui/Field';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { PasswordMeter } from './PasswordMeter';

const ROLES = [
  {
    role: Role.COACH,
    title: "I'm a Coach",
    blurb: 'Manage rosters and set progression rules',
    icon: <path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z" />,
  },
  {
    role: Role.CLIENT,
    title: "I'm a Client",
    blurb: 'Log sets and see your next target',
    icon: (
      <>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
      </>
    ),
  },
] as const;

export function SignupForm() {
  const id = useId();
  const [state, action] = useActionState<ActionResult | null, FormData>(signup, null);
  const [role, setRole] = useState<Role>(Role.COACH);
  const [password, setPassword] = useState('');

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="role" value={role} />
      <div role="radiogroup" aria-label="Account role" className="grid gap-3 sm:grid-cols-2">
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
                'flex flex-col gap-2 rounded-md border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
                on ? 'border-2 border-primary bg-raised' : 'border-line bg-canvas-low hover:border-line-strong',
              )}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={clsx('size-6', on ? 'text-primary' : 'text-muted')} aria-hidden="true">
                {r.icon}
              </svg>
              <span>
                <span className="block font-semibold">{r.title}</span>
                <span className="block text-sm text-muted">{r.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div>
        <Label htmlFor={`${id}-name`}>Full name</Label>
        <Input id={`${id}-name`} name="name" autoComplete="name" required maxLength={100} placeholder="Alex Ray" />
      </div>
      <div>
        <Label htmlFor={`${id}-email`}>Email</Label>
        <Input id={`${id}-email`} name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </div>
      <div>
        <Label htmlFor={`${id}-pw`}>Password</Label>
        <PasswordInput
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
      <label className="flex min-h-11 items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="terms" required className="mt-0.5 size-5 shrink-0 accent-primary" />
        <span>I agree to the Terms of Service and Privacy Policy.</span>
      </label>
      <FormError>{state?.ok === false ? state.error : undefined}</FormError>
      <SubmitButton className="w-full" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
