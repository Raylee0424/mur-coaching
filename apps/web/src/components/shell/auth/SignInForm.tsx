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
    <form action={action} className="space-y-5">
      {locked ? (
        <div role="alert" className="flex gap-3 border-l-2 border-l-amber bg-amber-bg px-3 py-2 text-ui text-amber">
          <Icon icon={Lock} />
          <p>{state.error}</p>
        </div>
      ) : null}
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input size="lg" id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" aria-invalid={fieldError ? true : undefined} />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot" className="mb-1 text-xs text-ink underline underline-offset-2 hover:text-primary-soft">
            Forgot password?
          </Link>
        </div>
        <PasswordInput size="lg"           id="password"
          name="password"
          autoComplete="current-password"
          required
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? 'password-error' : undefined}
        />
        {fieldError ? (
          <p id="password-error" role="alert" className="mt-1 text-meta font-medium text-danger">
            {fieldError}
          </p>
        ) : null}
      </div>
      <SubmitButton size="lg" className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
