'use client';

import clsx from 'clsx';
import { CircleCheck, Minus, Plus } from 'lucide-react';
import { useId, useState, useTransition } from 'react';
import { GOAL_OPTIONS, LIMITATION_OPTIONS, WeightUnit } from '@coaching/shared';
import type { MeProfileDto } from '@coaching/shared';
import { finishOnboarding, saveAccount, saveBaselines, saveProfile } from '@/actions/onboarding';
import { Button } from '@/components/ui/Button';
import { Chips } from '@/components/ui/Chips';
import { FieldError, FormError, Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import type { ActionResult } from '@/lib/action-result';
import { unitLabel } from '@/lib/units';
import {
  CLIENT_STEPS,
  EXPERIENCE_OPTIONS,
  initialAnswers,
  liftsToInput,
  resumeStep,
  toggleLimitation,
  validateStep,
  type ClientAnswers,
  type StepErrors,
} from './client-onboarding-model';
import { StepHeader, StepTitle } from './Stepper';

interface Props {
  me: MeProfileDto;
  unit: WeightUnit;
  lifts: { exerciseId: string; name: string }[];
  hasCoach: boolean;
  /** Replaying a finished onboarding (demo link): start at step 1. */
  replay: boolean;
}

const textarea =
  'block w-full rounded border border-line-strong bg-canvas-low px-3 py-2 text-body text-ink placeholder:text-faint hover:border-faint';

export function ClientOnboarding({ me, unit, lifts, hasCoach, replay }: Props) {
  const id = useId();
  const [step, setStep] = useState(() => (replay ? 0 : resumeStep(me)));
  const [a, setA] = useState<ClientAnswers>(() => initialAnswers(me, unit, lifts));
  const [errors, setErrors] = useState<StepErrors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const patch = (p: Partial<ClientAnswers>) => setA((x) => ({ ...x, ...p }));
  const last = CLIENT_STEPS.length - 1;

  /** Saves this step's answers, then moves on. Every step persists so a refresh resumes here. */
  function next(): void {
    const errs = validateStep(step, a);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setFormError(undefined);
    startTransition(async () => {
      let r: ActionResult<unknown> = { ok: true, data: null };
      if (step === 0) r = await saveProfile({ goals: a.goals, goalNote: a.goalNote.trim() || null });
      if (step === 1) {
        r = await saveAccount({ weightUnit: a.unit });
        if (r.ok) r = await saveProfile({ experience: a.experience, daysPerWeek: a.daysPerWeek });
      }
      if (step === 2) r = await saveProfile({ limitations: a.limitations, limitationsNote: a.limitationsNote.trim() || null });
      if (step === 3 && a.lifts.length > 0) r = await saveBaselines(liftsToInput(a));
      if (step === last) r = await finishOnboarding();
      if (!r.ok) setFormError(r.error);
      else if (step < last) setStep(step + 1);
    });
  }

  function back(): void {
    setErrors({});
    setFormError(undefined);
    setStep((s) => Math.max(0, s - 1));
  }

  const setLift = (exerciseId: string, p: Partial<ClientAnswers['lifts'][number]>) =>
    patch({ lifts: a.lifts.map((l) => (l.exerciseId === exerciseId ? { ...l, ...p } : l)) });

  return (
    <div className="space-y-8">
      <StepHeader steps={CLIENT_STEPS} current={step} />

      {step === 0 ? (
        <section className="space-y-5">
          <StepTitle title="What are you training for?" subtitle="Pick everything that fits. Your coach sees this." />
          <Chips
            label="Goals"
            options={GOAL_OPTIONS}
            selected={a.goals}
            describedBy={errors.goals ? `${id}-goals` : undefined}
            onToggle={(g) => patch({ goals: a.goals.includes(g) ? a.goals.filter((x) => x !== g) : [...a.goals, g] })}
          />
          <FieldError id={`${id}-goals`}>{errors.goals}</FieldError>
          <div>
            <Label htmlFor={`${id}-goalnote`}>Anything else? (optional)</Label>
            <textarea id={`${id}-goalnote`} rows={2} maxLength={500} value={a.goalNote} onChange={(e) => patch({ goalNote: e.target.value })} className={textarea} />
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-6">
          <StepTitle title="Units and experience" />
          <fieldset>
            <legend className="mb-2 font-mono text-micro uppercase text-muted">Weights in</legend>
            <div className="flex gap-0.5 rounded border border-line bg-canvas-low p-0.5">
              {[WeightUnit.KG, WeightUnit.LB].map((u) => (
                <button
                  key={u}
                  type="button"
                  aria-pressed={a.unit === u}
                  onClick={() => patch({ unit: u, lifts: a.lifts.map((l) => ({ ...l, weight: '' })) })}
                  className={clsx('h-11 flex-1 rounded-sm text-ui', a.unit === u ? 'bg-raised text-ink' : 'text-muted hover:text-ink')}
                >
                  {u === WeightUnit.KG ? 'Kilograms (kg)' : 'Pounds (lb)'}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset aria-describedby={errors.experience ? `${id}-exp` : undefined}>
            <legend className="mb-2 font-mono text-micro uppercase text-muted">Experience</legend>
            <div className="space-y-2">
              {EXPERIENCE_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={clsx(
                    'flex min-h-14 cursor-pointer items-center gap-3 rounded-md border px-4 py-3',
                    a.experience === o.value ? 'border-ink bg-raised' : 'border-line-strong hover:bg-raised/60',
                  )}
                >
                  <input type="radio" name={`${id}-exp`} className="size-4" checked={a.experience === o.value} onChange={() => patch({ experience: o.value })} />
                  <span>
                    <span className="block text-ui font-medium">{o.label}</span>
                    <span className="block text-meta text-muted">{o.description}</span>
                  </span>
                </label>
              ))}
            </div>
            <FieldError id={`${id}-exp`}>{errors.experience}</FieldError>
          </fieldset>
          <div>
            <span id={`${id}-days`} className="mb-2 block font-mono text-micro uppercase text-muted">
              Training days per week
            </span>
            <div className="flex items-center gap-3" role="group" aria-labelledby={`${id}-days`}>
              <Button variant="secondary" size="lg" className="w-11 px-0" aria-label="Fewer days" disabled={a.daysPerWeek <= 1} onClick={() => patch({ daysPerWeek: a.daysPerWeek - 1 })}>
                <Icon icon={Minus} size={20} />
              </Button>
              <output aria-live="polite" className="w-12 text-center font-mono text-metric">
                {a.daysPerWeek}
              </output>
              <Button variant="secondary" size="lg" className="w-11 px-0" aria-label="More days" disabled={a.daysPerWeek >= 7} onClick={() => patch({ daysPerWeek: a.daysPerWeek + 1 })}>
                <Icon icon={Plus} size={20} />
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-5">
          <StepTitle title="Any injuries or limitations?" subtitle="This goes straight to your coach so they can adjust your plan." />
          <Chips
            label="Body areas"
            options={LIMITATION_OPTIONS}
            selected={a.limitations}
            describedBy={errors.limitations ? `${id}-lim` : undefined}
            onToggle={(v) => patch({ limitations: toggleLimitation(a.limitations, v) })}
          />
          <FieldError id={`${id}-lim`}>{errors.limitations}</FieldError>
          <div>
            <Label htmlFor={`${id}-limnote`}>Details (optional)</Label>
            <textarea id={`${id}-limnote`} rows={3} maxLength={1000} value={a.limitationsNote} onChange={(e) => patch({ limitationsNote: e.target.value })} className={textarea} placeholder="e.g. left shoulder gets cranky on heavy pressing" />
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-5">
          <StepTitle title="Starting weights" subtitle="Enter a weight you could lift for 5 clean reps. The engine uses it as your baseline." />
          {a.lifts.length === 0 ? <p className="text-ui text-muted">No lifts to set yet. You can skip this step.</p> : null}
          <ul className="divide-y divide-line border-y border-line">
            {a.lifts.map((l) => {
              const wErr = errors[`lift.${l.exerciseId}.weight`];
              const rErr = errors[`lift.${l.exerciseId}.reps`];
              return (
                <li key={l.exerciseId} className="space-y-3 py-4">
                    <h2 className="font-sans text-ui font-medium" style={{ fontStretch: '100%', letterSpacing: 0 }}>{l.name}</h2>
                    {l.unknown ? (
                      <p className="text-ui text-muted">We&apos;ll start conservative. Your first sessions will calibrate this.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`${id}-${l.exerciseId}-w`}>Weight ({unitLabel(a.unit)})</Label>
                          <Input size="lg" id={`${id}-${l.exerciseId}-w`} type="number" inputMode="decimal" min={0} value={l.weight} aria-invalid={wErr ? true : undefined} onChange={(e) => setLift(l.exerciseId, { weight: e.target.value })} />
                        </div>
                        <div>
                          <Label htmlFor={`${id}-${l.exerciseId}-r`}>Reps</Label>
                          <Input size="lg" id={`${id}-${l.exerciseId}-r`} type="number" inputMode="numeric" min={1} max={50} value={l.reps} aria-invalid={rErr ? true : undefined} onChange={(e) => setLift(l.exerciseId, { reps: e.target.value })} />
                        </div>
                      </div>
                    )}
                    <FieldError>{wErr ?? rErr}</FieldError>
                    <label className="flex min-h-11 items-center gap-3 text-ui">
                      <input type="checkbox" className="size-4" checked={l.unknown} onChange={(e) => setLift(l.exerciseId, { unknown: e.target.checked })} />
                      I don&apos;t know yet
                    </label>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="space-y-5">
          <div className="space-y-3">
            <span className="inline-flex text-emerald">
              <Icon icon={CircleCheck} size={20} />
            </span>
            <StepTitle title="You’re all set" subtitle={hasCoach ? 'Your baseline targets are loaded. Your coach can see these answers and will tune your plan.' : 'Your baseline targets are loaded and ready for Day 1.'} />
          </div>
          <div className="divide-y divide-line border-y border-line">
            <Summary label="Goals" value={a.goals.join(', ') || 'Not set'} />
            <Summary label="Experience" value={`${EXPERIENCE_OPTIONS.find((o) => o.value === a.experience)?.label ?? 'Not set'} · ${a.daysPerWeek} days / week`} />
            <Summary label="Units" value={a.unit === WeightUnit.LB ? 'Pounds' : 'Kilograms'} />
            <Summary label="Limitations" value={a.limitations.join(', ') || 'Not set'} />
            <Summary
              label="Starting weights"
              value={a.lifts.map((l) => `${l.name}: ${l.unknown ? 'to calibrate' : `${l.weight} ${unitLabel(a.unit)} × ${l.reps}`}`).join(' · ') || 'None'}
            />
          </div>
        </section>
      ) : null}

      <FormError>{formError}</FormError>

      <footer className="flex items-center justify-end gap-2 border-t border-line pt-4">
        {step > 0 ? (
          <Button variant="ghost" size="lg" onClick={back} disabled={pending}>
            Back
          </Button>
        ) : null}
        {step > 0 && step < last ? (
          <Button
            variant="ghost"
            size="lg"
            disabled={pending}
            onClick={() => {
              setErrors({});
              setStep(step + 1);
            }}
          >
            Skip
          </Button>
        ) : null}
        <Button size="lg" onClick={next} disabled={pending}>
          {pending ? 'Saving…' : step === last ? 'Go to today' : 'Continue'}
        </Button>
      </footer>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3">
      <p className="font-mono text-micro uppercase text-muted">{label}</p>
      <p className="text-ui">{value}</p>
    </div>
  );
}
