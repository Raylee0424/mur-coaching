'use client';

import Link from 'next/link';
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
        <StatusIcon tone="emerald">
          <circle cx="12" cy="12" r="10" />
          <path d="m8 12 3 3 5-6" />
        </StatusIcon>
        <AuthHeading title="Password updated" subtitle="You can now sign in with your new password." />
        <Link href="/login" className={buttonClass('primary')}>
          Back to sign in
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="space-y-6">
        <StatusIcon tone="rose">
          <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
          <path d="m3 3 18 18" />
        </StatusIcon>
        <AuthHeading title="Reset link missing" subtitle="Open the link from your email, or request a new one." />
        <Link href="/forgot" className={buttonClass('primary')}>
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AuthHeading title="Set new password" subtitle="Choose a strong password for your account." />
      <form action={action} className="space-y-5">
        <input type="hidden" name="token" value={token} />
        <div>
          <Label htmlFor="reset-password">New password</Label>
          <PasswordInput id="reset-password" name="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
          <PasswordMeter password={password} />
        </div>
        <div>
          <Label htmlFor="reset-confirm">Confirm password</Label>
          <PasswordInput id="reset-confirm" name="confirm" autoComplete="new-password" required placeholder="Re-enter password" />
        </div>
        <FormError>{state?.ok === false ? state.error : undefined}</FormError>
        {state?.ok === false && state.error.includes('Request a new one') ? (
          <Link href="/forgot" className="inline-block text-sm font-semibold text-primary hover:underline">
            Request a new link
          </Link>
        ) : null}
        <SubmitButton className="w-full" pendingLabel="Updating…">
          Update password
        </SubmitButton>
      </form>
    </div>
  );
}
