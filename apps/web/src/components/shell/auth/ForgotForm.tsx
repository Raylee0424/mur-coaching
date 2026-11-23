'use client';

import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { forgotPassword } from '@/actions/auth';
import type { ActionResult } from '@/lib/action-result';
import { buttonClass } from '@/components/ui/Button';
import { FormError, Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { AuthHeading, StatusIcon } from './AuthHeading';

const COOLDOWN = 30;

export function ForgotForm() {
  const [state, action] = useActionState<ActionResult<{ email: string }> | null, FormData>(forgotPassword, null);
  const [seconds, setSeconds] = useState(0);
  const [resending, startResend] = useTransition();
  const [resendError, setResendError] = useState<string>();
  const sent = state?.ok ? state.data.email : null;

  // Each successful send starts the resend cooldown.
  useEffect(() => {
    if (state?.ok) setSeconds(COOLDOWN);
  }, [state]);
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  if (sent) {
    return (
      <div className="space-y-6">
        <StatusIcon tone="primary" icon={Mail} />
        <AuthHeading title="Check your inbox" subtitle={<>If an account exists for <span className="font-semibold text-ink">{sent}</span>, we sent a reset link. It works once and expires in 1 hour.</>} />
        <FormError>{resendError}</FormError>
        <div className="flex flex-col gap-3 sm:flex-row">
          <form
            action={(fd) =>
              startResend(async () => {
                const r = await forgotPassword(null, fd);
                setResendError(r.ok ? undefined : r.error);
                if (r.ok) setSeconds(COOLDOWN);
              })
            }
          >
            <input type="hidden" name="email" value={sent} />
            <SubmitButton variant="secondary" disabled={seconds > 0 || resending} className="w-full sm:w-auto">
              {seconds > 0 ? `Resend in ${seconds}s` : 'Resend reset link'}
            </SubmitButton>
          </form>
          <Link href="/login" className={buttonClass('primary', undefined, 'lg')}>
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AuthHeading title="Reset your password" subtitle="Enter your email and we will send you a reset link." />
      <form action={action} className="space-y-5">
        <div>
          <Label htmlFor="forgot-email">Email</Label>
          <Input size="lg" id="forgot-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </div>
        <FormError>{state?.ok === false ? state.error : undefined}</FormError>
        <SubmitButton size="lg" className="w-full" pendingLabel="Sending…">
          Send reset link
        </SubmitButton>
      </form>
      <Link href="/login" className={buttonClass('ghost', undefined, 'lg')}>
        <Icon icon={ArrowLeft} />
        Back to sign in
      </Link>
    </div>
  );
}
