'use client';

import { useActionState, useEffect, useRef, useState, useTransition, type ClipboardEvent, type KeyboardEvent } from 'react';
import { resendVerification, verifyEmail } from '@/actions/auth';
import type { ActionResult } from '@/lib/action-result';
import { FormError } from '@/components/ui/Field';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { CODE_LENGTH, isCompleteCode, normalizeCode, setCodeDigits } from './auth-model';

const COOLDOWN = 30;

export function VerifyForm() {
  const [state, action] = useActionState<ActionResult | null, FormData>(verifyEmail, null);
  const [code, setCode] = useState('');
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState<string>();
  const [resending, startResend] = useTransition();

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const focus = (i: number): void => refs.current[Math.min(Math.max(i, 0), CODE_LENGTH - 1)]?.focus();

  function onChange(i: number, raw: string): void {
    const digits = raw.replace(/\D/g, '');
    setCode(setCodeDigits(code, i, digits));
    if (digits) focus(i + digits.length);
  }

  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Backspace' && !code[i]) {
      e.preventDefault();
      setCode(code.slice(0, Math.max(0, i - 1)) + code.slice(i));
      focus(i - 1);
    } else if (e.key === 'ArrowLeft') focus(i - 1);
    else if (e.key === 'ArrowRight') focus(i + 1);
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>): void {
    e.preventDefault();
    const pasted = normalizeCode(e.clipboardData.getData('text'));
    setCode(pasted);
    focus(pasted.length);
  }

  function resend(): void {
    setResendError(undefined);
    startResend(async () => {
      const r = await resendVerification();
      if (r.ok) {
        setResent(true);
        setSeconds(COOLDOWN);
      } else setResendError(r.error);
    });
  }

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-5">
        <input type="hidden" name="code" value={code} />
        <fieldset>
          <legend className="sr-only">6-digit verification code</legend>
          <div className="flex gap-2 sm:gap-3">
            {Array.from({ length: CODE_LENGTH }, (_, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                autoFocus={i === 0}
                maxLength={CODE_LENGTH}
                value={code[i] ?? ''}
                aria-label={`Digit ${i + 1}`}
                aria-invalid={state?.ok === false ? true : undefined}
                onChange={(e) => onChange(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onPaste={onPaste}
                onFocus={(e) => e.target.select()}
                className="size-12 min-w-0 flex-1 rounded border border-line-strong bg-canvas-low text-center font-mono text-h2 text-ink hover:border-faint aria-[invalid=true]:border-danger sm:h-14"
              />
            ))}
          </div>
        </fieldset>
        <FormError>{state?.ok === false ? state.error : undefined}</FormError>
        <SubmitButton size="lg" className="w-full" disabled={!isCompleteCode(code)} pendingLabel="Verifying…">
          Verify email
        </SubmitButton>
      </form>
      <div className="space-y-2 text-ui text-muted">
        <div className="flex flex-wrap items-center gap-2">
          <span>Didn&apos;t receive a code?</span>
          <button type="button" onClick={resend} disabled={seconds > 0 || resending} className="text-ink underline underline-offset-2 hover:text-primary-soft disabled:text-muted disabled:no-underline">
            {seconds > 0 ? `Resend in ${seconds}s` : 'Resend code'}
          </button>
        </div>
        {resent ? <p role="status" className="text-meta text-emerald">A new code was sent. Older codes no longer work.</p> : null}
        <FormError>{resendError}</FormError>
      </div>
    </div>
  );
}
