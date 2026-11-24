'use client';

import { useActionState } from 'react';
import { GOAL_OPTIONS } from '@coaching/shared';
import type { PublicIntakeDto } from '@coaching/shared';
import { submitApplication } from '@/actions/apply';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { SubmitButton } from '@/components/ui/SubmitButton';

const TEXTAREA =
  'block w-full rounded border border-line-strong bg-canvas-low px-3 py-2 text-ui text-ink placeholder:text-faint hover:border-faint';

/** Public application form. Coach questions follow the fixed fields. */
export function ApplyForm({ slug, form }: { slug: string; form: PublicIntakeDto }) {
  const [state, action] = useActionState(submitApplication, null);

  if (state?.ok) {
    return (
      <div role="status" className="border-l-2 border-l-emerald bg-emerald-bg px-4 py-3">
        <p className="text-ui font-medium text-emerald">Application sent</p>
        <p className="mt-0.5 text-meta text-muted">{form.coachName} will read it and reply by email.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="slug" value={slug} />
      {/* Honeypot: hidden from people and assistive tech; bots fill every field. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div>
        <Label htmlFor="apply-name">Full name</Label>
        <Input id="apply-name" name="name" required maxLength={100} autoComplete="name" size="lg" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="apply-email">Email address</Label>
          <Input id="apply-email" name="email" type="email" required maxLength={200} autoComplete="email" size="lg" />
        </div>
        <div>
          <Label htmlFor="apply-phone">Phone (optional)</Label>
          <Input id="apply-phone" name="phone" type="tel" maxLength={40} autoComplete="tel" size="lg" />
        </div>
      </div>
      <div>
        <Label htmlFor="apply-goal">Primary goal</Label>
        <Select id="apply-goal" name="goal" defaultValue="" size="lg">
          <option value="">Choose one</option>
          {GOAL_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="apply-days">Training days per week</Label>
          <Select id="apply-days" name="trainingDays" defaultValue="" size="lg">
            <option value="">Choose one</option>
            {[2, 3, 4, 5, 6].map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="apply-exp">Years of lifting</Label>
          <Input id="apply-exp" name="experienceYears" type="number" min={0} max={60} inputMode="numeric" size="lg" />
        </div>
      </div>

      {form.questions.map((q) => (
        <div key={q.id}>
          <Label htmlFor={`apply-${q.id}`}>
            {q.label}
            {q.required ? '' : ' (optional)'}
          </Label>
          {q.type === 'CHOICE' ? (
            <Select id={`apply-${q.id}`} name={`q:${q.id}`} required={q.required} defaultValue="" size="lg">
              <option value="">Choose one</option>
              {(q.options ?? []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          ) : (
            <textarea id={`apply-${q.id}`} name={`q:${q.id}`} required={q.required} rows={3} maxLength={1000} className={TEXTAREA} />
          )}
        </div>
      ))}

      <FormError>{state && !state.ok ? state.error : undefined}</FormError>
      <SubmitButton size="lg" pendingLabel="Sending…" className="w-full">
        Send application
      </SubmitButton>
    </form>
  );
}
