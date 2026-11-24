'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { useActionState } from 'react';
import { login } from '@/actions/auth';
import { Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { SubmitButton } from '@/components/ui/SubmitButton';
import type { LoginState } from './auth-model';

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState<LoginState, FormData>(login, null);
  const failed = state?.ok === false;
  const locked = failed && state.locked;
  const fieldError = failed && !locked ? state.error : undefined;

  return (
    <form action={action} className="flex flex-col gap-4">
      {locked ? (
        <div role="alert" className="flex items-start gap-3 rounded-sm border border-amber/40 bg-amber-bg p-3.5 font-sans text-label-md font-normal text-amber">
          <Icon icon={Lock} className="mt-0.5 shrink-0" />
          <p>{state.error}</p>
        </div>
      ) : null}
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input size="lg" id="email" name="email" type="email" autoComplete="email" required placeholder="alex@murcoaching.io" aria-invalid={fieldError ? true : undefined} />
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label htmlFor="password" className="mb-0">Password</Label>
          <Link href="/forgot" className="font-sans text-label-sm text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          size="lg"
          id="password"
          name="password"
          autoComplete="current-password"
          required
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? 'password-error' : undefined}
        />
        {fieldError ? (
          <p id="password-error" role="alert" className="mt-1.5 font-sans text-label-sm text-danger">
            {fieldError}
          </p>
        ) : null}
      </div>
      <SubmitButton size="lg" className="mt-1 w-full" pendingLabel="Signing in…">
        Sign In
      </SubmitButton>
    </form>
  );
}
