'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { login } from '@/actions/auth';
import { Input, Label } from '@/components/ui/Field';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { SubmitButton } from '@/components/ui/SubmitButton';
import type { LoginState } from './auth-model';

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState<LoginState, FormData>(login, null);
  const failed = state?.ok === false;
  const locked = failed && state.locked;
  const fieldError = failed && !locked ? state.error : undefined;

  return (
    <form action={action} className="space-y-5">
      {locked ? (
        <div role="alert" className="flex gap-3 rounded-md border border-amber/40 bg-amber-bg px-4 py-3 text-sm font-medium text-amber">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 size-5 shrink-0" aria-hidden="true">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <p>{state.error}</p>
        </div>
      ) : null}
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" aria-invalid={fieldError ? true : undefined} />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot" className="mb-1 text-xs font-semibold text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? 'password-error' : undefined}
        />
        {fieldError ? (
          <p id="password-error" role="alert" className="mt-1 text-sm font-medium text-danger">
            {fieldError}
          </p>
        ) : null}
      </div>
      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
