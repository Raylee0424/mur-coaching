'use client';

import { CheckInQuestionKind, CHECK_IN_LIMITS } from '@coaching/shared';
import type { DueCheckInDto } from '@coaching/shared';
import { useState, useTransition } from 'react';
import { submitCheckIn } from '@/actions/check-ins';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';

/** Client form for one open check-in period. */
export function CheckInForm({ checkIn, dueLabel }: { checkIn: DueCheckInDto; dueLabel: string }) {
  const toast = useToast();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function submit(form: FormData): void {
    setError(undefined);
    const answers = checkIn.questions.map((q) => {
      const v = String(form.get(q.id) ?? '').trim();
      return { questionId: q.id, value: v || null };
    });
    start(async () => {
      const res = await submitCheckIn(checkIn.scheduleId, { periodDate: checkIn.periodDate, answers });
      if (!res.ok) return setError(res.error);
      toast.show({ message: 'Check-in sent to your coach', tone: 'ok' });
    });
  }

  return (
    <form action={submit} className="space-y-5 rounded-md border border-line bg-card p-4">
      <header>
        <p className="font-mono text-micro uppercase text-signal">Weekly coach check-in</p>
        <h2 className="mt-1 font-display text-title font-semibold">{checkIn.templateTitle}</h2>
        <p className="text-meta text-muted">{dueLabel}</p>
      </header>
      {checkIn.questions.map((q) => {
        const id = `${checkIn.scheduleId}-${q.id}`;
        const label = `${q.prompt}${q.unit ? ` (${q.unit})` : ''}${q.required ? '' : ' (optional)'}`;
        if (q.kind === CheckInQuestionKind.SCALE) {
          return (
            <fieldset key={q.id}>
              <legend className="mb-1.5 font-mono text-micro uppercase text-muted">{label}</legend>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="flex size-11 cursor-pointer items-center justify-center rounded border border-line-strong text-ui has-[:checked]:border-signal has-[:checked]:text-signal">
                    <input type="radio" name={q.id} value={n} required={q.required} className="sr-only" />
                    {n}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-meta text-faint">1 = poor · 5 = great</p>
            </fieldset>
          );
        }
        return (
          <div key={q.id}>
            <Label htmlFor={id}>{label}</Label>
            {q.kind === CheckInQuestionKind.NUMBER ? (
              <Input id={id} name={q.id} type="number" inputMode="decimal" step="0.01" required={q.required} size="lg" />
            ) : (
              <textarea
                id={id}
                name={q.id}
                required={q.required}
                maxLength={CHECK_IN_LIMITS.maxText}
                rows={3}
                className="block w-full rounded border border-line-strong bg-canvas-low px-3 py-2 text-body text-ink hover:border-faint"
              />
            )}
          </div>
        );
      })}
      <FormError>{error}</FormError>
      <Button type="submit" size="lg" className="w-full" disabled={pending} aria-busy={pending}>
        {pending ? 'Sending…' : 'Submit check-in to coach'}
      </Button>
    </form>
  );
}
