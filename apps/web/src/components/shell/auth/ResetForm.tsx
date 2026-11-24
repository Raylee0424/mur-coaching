'use client';

import Link from 'next/link';
import { CircleCheck, Unlink } from 'lucide-react';
import { useActionState, useState } from 'react';
import { resetPassword } from '@/actions/auth';
import type { ActionResult } from '@/lib/action-result';
import { buttonClass } from '@/components/ui/Button';
import { FormError, Label } from '@/components/ui/Field';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { AuthHeading, StatusIcon } from './AuthHeading';
import { PasswordMeter } from './PasswordMeter';

export function ResetForm({ token }: { token: string | undefined }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(resetPassword, null);
  const [password, setPassword] = useState('');

  if (state?.ok) {
    return (
      <div className="space-y-6">
        <StatusIcon tone="emerald" icon={CircleCheck} />
        <AuthHeading title="Password updated" subtitle="You can now sign in with your new password." />
        <Link href="/login" className={buttonClass('primary', 'w-full justify-center', 'lg')}>
          Back to Sign In
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="space-y-6">
        <StatusIcon tone="rose" icon={Unlink} />
        <AuthHeading title="Reset link missing" subtitle="Open the link from your email, or request a new one." />
        <Link href="/forgot" className={buttonClass('primary', 'w-full justify-center', 'lg')}>
          Request a New Link
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AuthHeading title="Set new password" subtitle="Choose a strong password for your account." />
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="token" value={token} />
        <div>
          <Label htmlFor="reset-password">New password</Label>
          <PasswordInput
            size="lg"
            id="reset-password"
            name="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          <PasswordMeter password={password} />
        </div>
        <div>
          <Label htmlFor="reset-confirm">Confirm password</Label>
          <PasswordInput size="lg" id="reset-confirm" name="confirm" autoComplete="new-password" required placeholder="Re-enter password" />
        </div>
        <FormError>{state?.ok === false ? state.error : undefined}</FormError>
        {state?.ok === false && state.error.includes('Request a new one') ? (
          <Link href="/forgot" className="inline-block font-sans text-label-md text-primary hover:underline">
            Request a new link
          </Link>
        ) : null}
        <SubmitButton size="lg" className="w-full" pendingLabel="Updating…">
          Update Password
        </SubmitButton>
      </form>
    </div>
  );
}
