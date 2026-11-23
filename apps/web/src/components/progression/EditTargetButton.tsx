'use client';

import { Pencil } from 'lucide-react';
import { useId, useState, useTransition } from 'react';
import { RecommendationStatus } from '@coaching/shared';
import type { RecommendationDto, WeightUnit } from '@coaching/shared';
import { overrideRecommendation, recommendationAction } from '@/actions/progression';
import { Button } from '@/components/ui/Button';
import { FieldError, FormError, Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { formatTarget } from '@/lib/format';
import { unitLabel, unitStep } from '@/lib/units';
import { ActionBadge } from './ActionBadge';
import {
  initialDraft,
  subjectFromRecommendation,
  validateDraft,
  type Draft,
  type DraftErrors,
  type EditTargetSubject,
} from './edit-target-model';

interface Props {
  recommendation: RecommendationDto;
  exerciseName: string;
  unit: WeightUnit;
}

/** Coach-only: replace the engine's target. The engine call stays visible above the form. */
export function EditTargetButton({ recommendation, exerciseName, unit }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Icon icon={Pencil} />
        Edit target
      </Button>
      {open ? (
        <EditTargetDialog subject={subjectFromRecommendation(recommendation, exerciseName)} unit={unit} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

/** Mount it only while open: it resets its draft from `subject` on mount. */
export function EditTargetDialog({ subject, unit, onClose }: { subject: EditTargetSubject; unit: WeightUnit; onClose: () => void }) {
  const id = useId();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(() => initialDraft(subject, unit));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const pendingRec = subject.status === RecommendationStatus.PENDING;
  const engineTarget = formatTarget(
    {
      recommendedSets: null,
      recommendedRepsMin: subject.engine.repsMin,
      recommendedRepsMax: subject.engine.repsMax,
      recommendedWeightKg: subject.engine.weightKg,
    },
    unit,
  );

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDraft((d) => ({ ...d, [key]: e.target.value }));
    setErrors((errs) => ({ ...errs, [key]: undefined }));
  };

  function save(): void {
    const { errors: errs, body } = validateDraft(draft, unit);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    startTransition(async () => {
      const result = await overrideRecommendation(subject.clientId, subject.recommendationId, body);
      if (result.ok) {
        toast.show({ message: `Saved target for ${subject.exerciseName}`, tone: 'ok' });
        onClose();
      } else setFormError(result.error);
    });
  }

  function acceptEngineTarget(): void {
    const fd = new FormData();
    fd.set('clientId', subject.clientId);
    fd.set('recommendationId', subject.recommendationId);
    fd.set('exerciseId', subject.exerciseId);
    fd.set('intent', 'ACCEPTED');
    startTransition(async () => {
      const result = await recommendationAction(null, fd);
      if (result.ok) {
        toast.show({ message: `Accepted ${subject.exerciseName}`, tone: 'ok' });
        onClose();
      } else setFormError(result.error);
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
        className="font-mono"
      />
      <FieldError id={`${id}-${key}-error`}>{errors[key]}</FieldError>
    </div>
  );

  return (
    <Sheet
      open
      onClose={onClose}
      title={subject.exerciseName}
      description="Override the engine's next-session prescription."
      footer={
        <>
          {pendingRec ? (
            <Button variant="ghost" onClick={acceptEngineTarget} disabled={pending}>
              Use engine target
            </Button>
          ) : (
            <Button variant="ghost" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
          )}
          <Button onClick={save} disabled={pending}>
            {pending ? 'Saving…' : 'Save override'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-micro uppercase text-muted">Engine proposed</span>
            <ActionBadge action={subject.action} />
          </div>
          {engineTarget ? (
            <p className="font-mono text-metric">
              {engineTarget}
              {subject.rpeCap !== null ? <span className="ml-2 text-ui text-muted">@ RPE {subject.rpeCap}</span> : null}
            </p>
          ) : null}
          <p className="text-meta text-muted">{subject.reason}</p>
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
            className="block w-full rounded border border-line-strong bg-canvas-low px-3 py-2 text-ui text-ink placeholder:text-faint hover:border-faint"
          />
          <FieldError>{errors.note}</FieldError>
        </div>

        <p className="border-l-2 border-l-ink bg-raised px-3 py-2 text-meta text-muted">
          Visible to the client on Today and Lift detail as a coach override.
        </p>

        <FormError>{formError}</FormError>
      </div>
    </Sheet>
  );
}
