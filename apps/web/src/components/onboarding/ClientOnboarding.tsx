'use client';

import clsx from 'clsx';
import { Briefcase, CircleCheck, Dumbbell, Home, Minus, Plus, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useState, useTransition } from 'react';
import { EQUIPMENT_LABELS, type Equipment, GOAL_OPTIONS, LIMITATION_OPTIONS, WeightUnit } from '@coaching/shared';
import type { MeProfileDto } from '@coaching/shared';
import { finishOnboarding, saveAccount, saveBaselines, saveProfile } from '@/actions/onboarding';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Chips } from '@/components/ui/Chips';
import { FieldError, FormError, Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import type { ActionResult } from '@/lib/action-result';
import { unitLabel } from '@/lib/units';
import {
  CLIENT_STEPS,
  countEligibleMovements,
  EXPERIENCE_OPTIONS,
  GYM_PROFILE_STORAGE_KEY,
  GYM_PROFILES,
  initialAnswers,
  isEquipmentEligible,
  liftsToInput,
  resumeStep,
  toggleLimitation,
  validateStep,
  type ClientAnswers,
  type GymProfileId,
  type StepErrors,
} from './client-onboarding-model';
import { StepHeader, StepTitle } from './Stepper';

export interface FirstSessionItem {
  name: string;
  equipment: Equipment | null;
  prescription: string;
}

interface Props {
  me: MeProfileDto;
  unit: WeightUnit;
  lifts: { exerciseId: string; name: string }[];
  library: { id: string; name: string; equipment: Equipment | null }[];
  firstSession: { title: string; subtitle: string; items: FirstSessionItem[] };
  hasCoach: boolean;
  /** Replaying a finished onboarding (demo link): start at step 1. */
  replay: boolean;
}

const GYM_ICONS: Record<GymProfileId, LucideIcon> = {
  COMMERCIAL: Dumbbell,
  HOME_RACK: Home,
  HOTEL_DB: Briefcase,
};

const textarea =
  'block w-full rounded-sm border border-line bg-canvas-low px-3.5 py-2.5 font-sans text-body-md text-ink placeholder:text-muted transition-colors hover:border-line-strong focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

export function ClientOnboarding({ me, unit, lifts, library, firstSession, hasCoach, replay }: Props) {
  const id = useId();
  const [step, setStep] = useState(() => (replay ? 0 : resumeStep(me)));
  const [a, setA] = useState<ClientAnswers>(() => initialAnswers(me, unit, lifts));
  const [errors, setErrors] = useState<StepErrors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const patch = (p: Partial<ClientAnswers>) => setA((x) => ({ ...x, ...p }));
  const last = CLIENT_STEPS.length - 1;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(GYM_PROFILE_STORAGE_KEY) as GymProfileId | null;
      if (saved && GYM_PROFILES.some((g) => g.id === saved)) {
        setA((x) => ({ ...x, gymProfile: saved }));
      }
    } catch {
      // Ignore storage access errors in private browsing.
    }
  }, []);

  function selectGym(gymProfile: GymProfileId): void {
    patch({ gymProfile });
    try {
      localStorage.setItem(GYM_PROFILE_STORAGE_KEY, gymProfile);
    } catch {
      // Ignore storage access errors.
    }
  }

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
      if (step === 2) {
        try {
          localStorage.setItem(GYM_PROFILE_STORAGE_KEY, a.gymProfile);
        } catch {
          // Ignore storage access errors.
        }
      }
      if (step === 3) r = await saveProfile({ limitations: a.limitations, limitationsNote: a.limitationsNote.trim() || null });
      if (step === 4 && a.lifts.length > 0) r = await saveBaselines(liftsToInput(a));
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

  const totalMovements = library.length;
  const eligibleCount = countEligibleMovements(library, a.gymProfile);
  const gymLabel = GYM_PROFILES.find((g) => g.id === a.gymProfile)?.title ?? 'Commercial Barbell Gym';

  return (
    <div className="space-y-8">
      <StepHeader steps={CLIENT_STEPS} current={step} onSelect={pending ? undefined : setStep} />

      {step === 2 ? (
        /* Stitch 2-column Gym Equipment step (`mur_coaching_athlete_web_onboarding_step_2_gym_equipment`) */
        <section className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <StepTitle
                title="Select Your Gym Equipment"
                subtitle="Your program highlights movements that match what you have on the floor."
              />
              <div className="flex shrink-0 items-center gap-2 rounded-full border border-primary/40 bg-primary-container px-4 py-1.5">
                <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
                <span className="font-mono text-label-md text-primary tabular-nums">
                  {eligibleCount} / {totalMovements} movements
                </span>
              </div>
            </div>

            <div role="radiogroup" aria-label="Gym Equipment Profile" className="flex flex-col gap-3.5">
              {GYM_PROFILES.map((g) => {
                const selected = a.gymProfile === g.id;
                const count = countEligibleMovements(library, g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => selectGym(g.id)}
                    className={clsx(
                      'flex items-start justify-between gap-4 rounded-md border p-5 text-left transition-colors',
                      selected ? 'border-primary bg-raised' : 'border-line bg-card hover:bg-raised',
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <span
                        className={clsx(
                          'inline-flex size-11 shrink-0 items-center justify-center rounded-sm border',
                          selected
                            ? 'border-primary/40 bg-primary-container text-primary'
                            : 'border-line bg-canvas-low text-muted',
                        )}
                      >
                        <Icon icon={GYM_ICONS[g.id]} size={20} />
                      </span>
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h2 className="font-display text-title-md text-ink">{g.title}</h2>
                          {selected ? (
                            <span className="rounded-full bg-primary px-2.5 py-0.5 font-mono text-label-sm text-primary-ink">
                              Selected
                            </span>
                          ) : null}
                        </div>
                        <p className="font-sans text-label-md font-normal text-muted">{g.description}</p>
                      </div>
                    </div>
                    <span className={clsx('shrink-0 font-mono text-label-md tabular-nums', selected ? 'text-primary' : 'text-muted')}>
                      {count} / {totalMovements}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="flex flex-col gap-5 rounded-md border border-line bg-card p-6 lg:col-span-5">
            <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
              <div>
                <span className="font-mono text-label-sm uppercase text-primary">FIRST SCHEDULED SESSION</span>
                <h2 className="mt-0.5 font-display text-title-lg text-ink">{firstSession.title}</h2>
                <p className="mt-1 font-mono text-label-sm text-muted">{firstSession.subtitle}</p>
              </div>
              <Badge tone="emerald">Ready</Badge>
            </div>

            <div className="divide-y divide-line">
              {firstSession.items.map((item, idx) => {
                const ok = isEquipmentEligible(item.equipment, a.gymProfile);
                return (
                  <div key={`${item.name}-${idx}`} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-sans text-label-md text-ink">
                        {idx + 1}. {item.name}
                      </p>
                      <p className={clsx('font-mono text-label-sm', ok ? 'text-muted' : 'text-amber')}>
                        {item.equipment ? EQUIPMENT_LABELS[item.equipment] : 'Standard gym'}
                        {ok ? '' : ' · swap suggested'}
                      </p>
                    </div>
                    <span className={clsx('shrink-0 font-mono text-label-md tabular-nums', idx === 0 ? 'text-primary' : 'text-ink')}>
                      {item.prescription}
                    </span>
                  </div>
                );
              })}
            </div>
          </aside>
        </section>
      ) : (
        <div className="mx-auto max-w-3xl rounded-md border border-line bg-card p-6 sm:p-8">
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
                <textarea
                  id={`${id}-goalnote`}
                  rows={2}
                  maxLength={500}
                  value={a.goalNote}
                  onChange={(e) => patch({ goalNote: e.target.value })}
                  className={textarea}
                />
              </div>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="space-y-6">
              <StepTitle title="Units & experience" subtitle="Configure weight units and weekly training cadence." />
              <fieldset>
                <legend className="mb-2 font-sans text-label-sm uppercase tracking-wider text-muted">Weights in</legend>
                <div className="grid grid-cols-2 gap-1.5 rounded-sm border border-line bg-canvas-low p-1">
                  {[WeightUnit.KG, WeightUnit.LB].map((u) => (
                    <button
                      key={u}
                      type="button"
                      aria-pressed={a.unit === u}
                      onClick={() => patch({ unit: u, lifts: a.lifts.map((l) => ({ ...l, weight: '' })) })}
                      className={clsx(
                        'rounded-sm py-2.5 font-sans text-label-md transition-colors',
                        a.unit === u ? 'bg-primary text-primary-ink' : 'text-muted hover:text-ink',
                      )}
                    >
                      {u === WeightUnit.KG ? 'Kilograms (kg)' : 'Pounds (lb)'}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset aria-describedby={errors.experience ? `${id}-exp` : undefined}>
                <legend className="mb-2 font-sans text-label-sm uppercase tracking-wider text-muted">Experience</legend>
                <div className="space-y-2.5">
                  {EXPERIENCE_OPTIONS.map((o) => (
                    <label
                      key={o.value}
                      className={clsx(
                        'flex min-h-14 cursor-pointer items-center gap-3 rounded-md border px-4 py-3 transition-colors',
                        a.experience === o.value ? 'border-primary bg-raised' : 'border-line bg-canvas-low hover:bg-raised',
                      )}
                    >
                      <input
                        type="radio"
                        name={`${id}-exp`}
                        className="size-4"
                        checked={a.experience === o.value}
                        onChange={() => patch({ experience: o.value })}
                      />
                      <span>
                        <span className="block font-display text-label-lg text-ink">{o.label}</span>
                        <span className="block font-sans text-label-sm font-normal text-muted">{o.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <FieldError id={`${id}-exp`}>{errors.experience}</FieldError>
              </fieldset>
              <div>
                <span id={`${id}-days`} className="mb-2 block font-sans text-label-sm uppercase tracking-wider text-muted">
                  Training days per week
                </span>
                <div className="flex items-center gap-3" role="group" aria-labelledby={`${id}-days`}>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-11 px-0"
                    aria-label="Fewer days"
                    disabled={a.daysPerWeek <= 1}
                    onClick={() => patch({ daysPerWeek: a.daysPerWeek - 1 })}
                  >
                    <Icon icon={Minus} size={20} />
                  </Button>
                  <output aria-live="polite" className="w-12 text-center font-mono text-metric text-ink">
                    {a.daysPerWeek}
                  </output>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-11 px-0"
                    aria-label="More days"
                    disabled={a.daysPerWeek >= 7}
                    onClick={() => patch({ daysPerWeek: a.daysPerWeek + 1 })}
                  >
                    <Icon icon={Plus} size={20} />
                  </Button>
                </div>
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="space-y-5">
              <StepTitle title="Injury & limitation flags" subtitle="This goes straight to your coach so they can adjust your plan." />
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
                <textarea
                  id={`${id}-limnote`}
                  rows={3}
                  maxLength={1000}
                  value={a.limitationsNote}
                  onChange={(e) => patch({ limitationsNote: e.target.value })}
                  className={textarea}
                  placeholder="e.g. left shoulder gets cranky on heavy pressing"
                />
              </div>
            </section>
          ) : null}

          {step === 4 ? (
            <section className="space-y-5">
              <StepTitle title="Starting weights" subtitle="Enter a weight you could lift for 5 clean reps. The engine uses it as your baseline." />
              {a.lifts.length === 0 ? <p className="text-body-md text-muted">No lifts to set yet. You can skip this step.</p> : null}
              <ul className="divide-y divide-line border-y border-line">
                {a.lifts.map((l) => {
                  const wErr = errors[`lift.${l.exerciseId}.weight`];
                  const rErr = errors[`lift.${l.exerciseId}.reps`];
                  return (
                    <li key={l.exerciseId} className="space-y-3 py-4">
                      <h2 className="font-display text-title-md text-ink">{l.name}</h2>
                      {l.unknown ? (
                        <p className="font-sans text-body-md text-muted">We&apos;ll start conservative. Your first sessions will calibrate this.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`${id}-${l.exerciseId}-w`}>Weight ({unitLabel(a.unit)})</Label>
                            <Input
                              size="lg"
                              id={`${id}-${l.exerciseId}-w`}
                              type="number"
                              inputMode="decimal"
                              min={0}
                              value={l.weight}
                              aria-invalid={wErr ? true : undefined}
                              onChange={(e) => setLift(l.exerciseId, { weight: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`${id}-${l.exerciseId}-r`}>Reps</Label>
                            <Input
                              size="lg"
                              id={`${id}-${l.exerciseId}-r`}
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={50}
                              value={l.reps}
                              aria-invalid={rErr ? true : undefined}
                              onChange={(e) => setLift(l.exerciseId, { reps: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                      <FieldError>{wErr ?? rErr}</FieldError>
                      <label className="flex min-h-10 cursor-pointer items-center gap-2.5 font-sans text-label-md font-normal text-muted">
                        <input
                          type="checkbox"
                          className="size-4"
                          checked={l.unknown}
                          onChange={(e) => setLift(l.exerciseId, { unknown: e.target.checked })}
                        />
                        I don&apos;t know yet
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {step === 5 ? (
            <section className="space-y-5">
              <div className="space-y-3">
                <span className="inline-flex size-10 items-center justify-center rounded-full border border-emerald/40 bg-emerald-bg text-emerald">
                  <Icon icon={CircleCheck} size={20} />
                </span>
                <StepTitle
                  title="You’re all set"
                  subtitle={
                    hasCoach
                      ? 'Your baseline targets are loaded. Your coach can see these answers and will tune your plan.'
                      : 'Your baseline targets are loaded and ready for Day 1.'
                  }
                />
              </div>
              <div className="divide-y divide-line border-y border-line">
                <Summary label="Goals" value={a.goals.join(', ') || 'Not set'} />
                <Summary
                  label="Experience"
                  value={`${EXPERIENCE_OPTIONS.find((o) => o.value === a.experience)?.label ?? 'Not set'} · ${a.daysPerWeek} days / week`}
                />
                <Summary label="Units & Gym" value={`${a.unit === WeightUnit.LB ? 'Pounds' : 'Kilograms'} · ${gymLabel}`} />
                <Summary label="Limitations" value={a.limitations.join(', ') || 'Not set'} />
                <Summary
                  label="Starting weights"
                  value={
                    a.lifts
                      .map((l) => `${l.name}: ${l.unknown ? 'to calibrate' : `${l.weight} ${unitLabel(a.unit)} × ${l.reps}`}`)
                      .join(' · ') || 'None'
                  }
                />
              </div>
            </section>
          ) : null}
        </div>
      )}

      <div className={clsx(step !== 2 && 'mx-auto max-w-3xl')}>
        <FormError>{formError}</FormError>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <div>
            {step > 0 ? (
              <Button variant="secondary" size="lg" onClick={back} disabled={pending}>
                Back
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
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
              {pending ? 'Saving…' : step === last ? 'Continue to Today Dashboard' : 'Continue'}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3">
      <p className="font-sans text-label-sm uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 font-sans text-body-md text-ink">{value}</p>
    </div>
  );
}
