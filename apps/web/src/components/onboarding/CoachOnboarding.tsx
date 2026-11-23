'use client';

import clsx from 'clsx';
import { useId, useMemo, useState, useTransition } from 'react';
import { ENGINE_DEFAULTS, ENGINE_LIMITS, MUSCLE_GROUP_LABELS, MuscleGroup, WeightUnit } from '@coaching/shared';
import type { AuthUser, CoachEngineRulesDto, ExerciseDto, UpdateCoachEngineRulesRequest } from '@coaching/shared';
import { saveEngineRules } from '@/actions/engine-rules';
import { finishOnboarding, saveAccount } from '@/actions/onboarding';
import { PreviewLine, type PreviewTarget } from '@/components/engine/PreviewLine';
import { RULE_FIELD_META } from '@/components/engine/rule-meta';
import { ExerciseForm } from '@/components/exercises/ExerciseForm';
import { Button } from '@/components/ui/Button';
import { FieldError, FormError, Input, Label } from '@/components/ui/Field';
import { OverrideField, parseOverride } from '@/components/ui/OverrideField';
import type { ActionResult } from '@/lib/action-result';
import { InviteStep } from './InviteStep';
import { StepHeader, StepTitle } from './Stepper';

const STEPS = ['Profile & brand', 'Engine defaults', 'Starter library', 'Invite first client'] as const;
const ENGINE_KEYS = ['rpeCap', 'deloadPercent', 'sessionsAnalyzed'] as const;
type EngineKey = (typeof ENGINE_KEYS)[number];

interface Props {
  user: AuthUser;
  rules: CoachEngineRulesDto;
  library: ExerciseDto[];
  previewTarget: PreviewTarget | null;
  replay: boolean;
}

export function CoachOnboarding({ user, rules, library, previewTarget, replay }: Props) {
  const id = useId();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user.name);
  const [displayName, setDisplayName] = useState(user.displayName ?? '');
  const [unit, setUnit] = useState<WeightUnit>(user.weightUnit);
  const [engine, setEngine] = useState<Record<EngineKey, string>>(() =>
    Object.fromEntries(ENGINE_KEYS.map((k) => [k, rules.rules[k] === null ? '' : String(rules.rules[k])])) as Record<EngineKey, string>,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const parsed = useMemo(
    () => Object.fromEntries(ENGINE_KEYS.map((k) => [k, parseOverride(engine[k], ENGINE_LIMITS[k])])) as Record<EngineKey, ReturnType<typeof parseOverride>>,
    [engine],
  );
  const draftRules: UpdateCoachEngineRulesRequest = { ...rules.rules };
  for (const k of ENGINE_KEYS) {
    const p = parsed[k];
    if (p.ok) draftRules[k] = p.value;
  }
  const engineValid = ENGINE_KEYS.every((k) => parsed[k].ok);
  const custom = library.filter((e) => e.coachId === user.id);
  const last = STEPS.length - 1;

  function next(): void {
    const errs: Record<string, string> = {};
    if (step === 0 && !name.trim()) errs.name = 'Enter your name.';
    setErrors(errs);
    if (Object.keys(errs).length > 0 || (step === 1 && !engineValid)) return;
    setFormError(undefined);
    startTransition(async () => {
      let r: ActionResult<unknown> = { ok: true, data: null };
      if (step === 0) r = await saveAccount({ name: name.trim(), displayName: displayName.trim(), weightUnit: unit });
      if (step === 1) r = await saveEngineRules(draftRules);
      if (step === last) r = await finishOnboarding();
      if (!r.ok) setFormError(r.error);
      else if (step < last) setStep(step + 1);
    });
  }

  return (
    <div>
      <div className="space-y-8">
        <StepHeader steps={STEPS} current={step} onSelect={pending ? undefined : setStep} />

        {step === 0 ? (
          <section className="space-y-5">
            <StepTitle title={replay ? 'Your coaching profile' : 'Profile & brand'} subtitle="This appears on client invites and inside their app." />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor={`${id}-name`}>Full name</Label>
                <Input size="lg" id={`${id}-name`} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} aria-invalid={errors.name ? true : undefined} />
                <FieldError>{errors.name}</FieldError>
              </div>
              <div>
                <Label htmlFor={`${id}-display`}>Coaching display name</Label>
                <Input size="lg" id={`${id}-display`} value={displayName} maxLength={60} placeholder="Coach Alex" onChange={(e) => setDisplayName(e.target.value)} />
              </div>
            </div>
            <fieldset>
              <legend className="mb-2 font-mono text-micro uppercase text-muted">Default units</legend>
              <div className="flex max-w-sm gap-0.5 rounded border border-line bg-canvas-low p-0.5">
                {[WeightUnit.KG, WeightUnit.LB].map((u) => (
                  <button
                    key={u}
                    type="button"
                    aria-pressed={unit === u}
                    onClick={() => setUnit(u)}
                    className={clsx('h-11 flex-1 rounded-sm font-mono text-micro uppercase', unit === u ? 'bg-raised text-ink' : 'text-muted hover:text-ink')}
                  >
                    {u === WeightUnit.KG ? 'kg' : 'lb'}
                  </button>
                ))}
              </div>
            </fieldset>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="space-y-5">
            <StepTitle title="Engine defaults" subtitle="Applied to every client unless you override them. Leave empty to keep the default." />
            <div className="grid gap-4 sm:grid-cols-3">
              {ENGINE_KEYS.map((k) => {
                const p = parsed[k];
                const meta = RULE_FIELD_META[k];
                return (
                  <OverrideField
                    key={k}
                    label={meta.label}
                    {...(meta.suffix ? { suffix: meta.suffix } : {})}
                    value={engine[k]}
                    onChange={(v) => setEngine((x) => ({ ...x, [k]: v }))}
                    defaultLabel={`Default: ${ENGINE_DEFAULTS[k]}.`}
                    min={ENGINE_LIMITS[k].min}
                    max={ENGINE_LIMITS[k].max}
                    step={ENGINE_LIMITS[k].step}
                    {...(p.ok ? {} : { error: p.error })}
                  />
                );
              })}
            </div>
            <p className="text-meta text-muted">Load increments are set per exercise in your library. Finer thresholds live under Settings.</p>
            {previewTarget && engineValid ? (
              <PreviewLine target={previewTarget} rules={draftRules} unit={unit} />
            ) : (
              <p className="rounded-md border border-dashed border-line-strong p-4 text-ui text-muted">
                A live preview appears here once a client has logged a prescribed lift twice.
              </p>
            )}
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-5">
            <StepTitle
              title="Starter library"
              subtitle={`Your clients already get ${library.filter((e) => e.coachId === null).length} global lifts. Add your own variations below.`}
            />
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {Object.values(MuscleGroup).map((g) => {
                const items = library.filter((e) => e.muscleGroup === g && e.coachId === null);
                return items.length === 0 ? null : (
                  <div key={g}>
                    <p className="font-mono text-micro uppercase text-muted">{MUSCLE_GROUP_LABELS[g]}</p>
                    <p className="text-ui">{items.map((e) => e.name).join(', ')}</p>
                  </div>
                );
              })}
            </div>
            {custom.length > 0 ? (
              <p className="text-ui">
                <span className="font-medium">Your exercises:</span> {custom.map((e) => e.name).join(', ')}
              </p>
            ) : null}
            <div className="rounded-md border border-line p-4">
              <h2 className="mb-3 font-sans text-ui font-medium" style={{ fontStretch: '100%', letterSpacing: 0 }}>Add a custom exercise</h2>
              <ExerciseForm mode="create" />
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-5">
            <StepTitle title="Invite your first client" subtitle="Send an onboarding link now, or skip and invite from your Roster." />
            <InviteStep />
          </section>
        ) : null}

        <FormError>{formError}</FormError>

        <footer className="flex items-center justify-end gap-2 border-t border-line pt-4">
          {step > 0 ? (
            <Button variant="ghost" size="lg" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={pending}>
              Back
            </Button>
          ) : null}
          {step >= 1 ? (
            <Button variant="ghost" size="lg" disabled={pending} onClick={() => (step === last ? next() : setStep(step + 1))}>
              {step === 2 ? 'Skip, I’ll build my own' : step === last ? 'Skip for now' : 'Skip'}
            </Button>
          ) : null}
          <Button size="lg" onClick={next} disabled={pending || (step === 1 && !engineValid)}>
            {pending ? 'Saving…' : step === last ? 'Go to roster' : 'Continue'}
          </Button>
        </footer>
      </div>
    </div>
  );
}
