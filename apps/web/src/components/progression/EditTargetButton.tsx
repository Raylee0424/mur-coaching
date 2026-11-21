'use client';

import { useId, useState, useTransition } from 'react';
import { RecommendationStatus, WORKOUT_LOG_LIMITS } from '@coaching/shared';
import type { RecommendationDto, WeightUnit } from '@coaching/shared';
import { overrideRecommendation, recommendationAction } from '@/actions/progression';
import { Button } from '@/components/ui/Button';
import { FieldError, FormError, Input, Label } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { formatTarget, toNumber } from '@/lib/format';
import { effectiveTarget } from '@/lib/targets';
import { displayToKg, kgToDisplay, unitLabel, unitStep } from '@/lib/units';
import { ActionBadge } from './ActionBadge';

interface Props {
  recommendation: RecommendationDto;
  exerciseName: string;
  unit: WeightUnit;
}

interface Draft {
  weight: string;
  repsMin: string;
  repsMax: string;
  rpe: string;
  note: string;
}

type Errors = Partial<Record<keyof Draft, string>>;

function initialDraft(rec: RecommendationDto, unit: WeightUnit): Draft {
  const t = effectiveTarget(rec);
  return {
    weight: t.weightKg === null ? '' : String(kgToDisplay(toNumber(t.weightKg), unit)),
    repsMin: t.repsMin === null ? '' : String(t.repsMin),
    repsMax: t.repsMax === null ? '' : String(t.repsMax),
    rpe: t.rpe === null ? '' : String(toNumber(t.rpe)),
    note: rec.overrideNote ?? '',
  };
}

function validate(d: Draft, unit: WeightUnit) {
  const errors: Errors = {};
  const weight = Number(d.weight);
  const repsMin = Number(d.repsMin);
  const repsMax = Number(d.repsMax);
  if (d.weight.trim() === '' || !Number.isFinite(weight) || weight < 0 || displayToKg(weight, unit) > WORKOUT_LOG_LIMITS.maxWeightKg) {
    errors.weight = 'Enter a weight.';
  }
  if (!Number.isInteger(repsMin) || repsMin < 1 || repsMin > 50) errors.repsMin = 'Whole number, 1–50.';
  if (!Number.isInteger(repsMax) || repsMax < 1 || repsMax > 50) errors.repsMax = 'Whole number, 1–50.';
  else if (!errors.repsMin && repsMin > repsMax) errors.repsMax = 'Must be at least the minimum.';
  const rpe = d.rpe.trim() === '' ? null : Number(d.rpe);
  if (rpe !== null && (!Number.isFinite(rpe) || rpe < 1 || rpe > 10 || Math.round(rpe * 2) !== rpe * 2)) {
    errors.rpe = '1–10 in steps of 0.5, or leave empty.';
  }
  if (d.note.length > 500) errors.note = 'At most 500 characters.';
  return { errors, body: { weightKg: displayToKg(weight, unit), repsMin, repsMax, rpe, ...(d.note.trim() ? { note: d.note.trim() } : {}) } };
}

/** Coach-only: replace the engine's target. The engine call stays visible above the form. */
export function EditTargetButton({ recommendation: rec, exerciseName, unit }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => initialDraft(rec, unit));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const pendingRec = rec.status === RecommendationStatus.PENDING;
  const engineTarget = formatTarget(rec, unit);

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDraft((d) => ({ ...d, [key]: e.target.value }));
    setErrors((errs) => ({ ...errs, [key]: undefined }));
  };

  function openSheet(): void {
    setDraft(initialDraft(rec, unit));
    setErrors({});
    setFormError(undefined);
    setOpen(true);
  }

  function save(): void {
    const { errors: errs, body } = validate(draft, unit);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    startTransition(async () => {
      const result = await overrideRecommendation(rec.clientId, rec.id, body);
      if (result.ok) setOpen(false);
      else setFormError(result.error);
    });
  }

  function acceptEngineTarget(): void {
    const fd = new FormData();
    fd.set('clientId', rec.clientId);
    fd.set('recommendationId', rec.id);
    fd.set('exerciseId', rec.exerciseId);
    fd.set('intent', 'ACCEPTED');
    startTransition(async () => {
      const result = await recommendationAction(null, fd);
      if (result.ok) setOpen(false);
      else setFormError(result.error);
    });
  }

  const field = (key: 'weight' | 'repsMin' | 'repsMax' | 'rpe', label: string, step: number, mode: 'decimal' | 'numeric') => (
    <div>
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <Input
        id={`${id}-${key}`}
        type="number"
        inputMode={mode}
        step={step}
        min={0}
        value={draft[key]}
        onChange={set(key)}
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={errors[key] ? `${id}-${key}-error` : undefined}
      />
      <FieldError id={`${id}-${key}-error`}>{errors[key]}</FieldError>
    </div>
  );

  return (
    <>
      <Button variant="secondary" className="min-h-9 py-1" onClick={openSheet}>
        Edit target
      </Button>
      {open ? (
      <Sheet open={open} onClose={() => setOpen(false)} title={`Edit target: ${exerciseName}`} description="Your numbers replace the engine's for this lift.">
        <div className="space-y-5">
          <section className="space-y-2 rounded-md border border-line bg-canvas-low p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Engine call</span>
              <ActionBadge action={rec.action} />
            </div>
            {engineTarget ? <p className="font-display text-lg font-bold tabular">{engineTarget}</p> : null}
            <p className="text-sm text-muted">{rec.reason}</p>
          </section>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {field('weight', `Weight (${unitLabel(unit)})`, unitStep(unit) / 2, 'decimal')}
            {field('repsMin', 'Reps min', 1, 'numeric')}
            {field('repsMax', 'Reps max', 1, 'numeric')}
            {field('rpe', 'RPE target', 0.5, 'decimal')}
          </div>

          <div>
            <Label htmlFor={`${id}-note`}>Note to client (optional)</Label>
            <textarea
              id={`${id}-note`}
              rows={3}
              maxLength={500}
              value={draft.note}
              onChange={set('note')}
              placeholder="Why you changed it, in plain words"
              className="block w-full rounded-md border border-line bg-canvas-low px-3 py-2 text-base text-ink placeholder:text-muted/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            />
            <FieldError>{errors.note}</FieldError>
          </div>

          <FormError>{formError}</FormError>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
            {pendingRec ? (
              <Button variant="secondary" onClick={acceptEngineTarget} disabled={pending}>
                Use engine target
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
            )}
            <Button onClick={save} disabled={pending}>
              {pending ? 'Saving…' : 'Save override'}
            </Button>
          </footer>
        </div>
      </Sheet>
      ) : null}
    </>
  );
}
