'use client';

import { useEffect, useState, useTransition } from 'react';
import type { ExerciseDto, WeightUnit, WorkoutLogDto } from '@coaching/shared';
import { createWorkoutLog } from '@/actions/workout-logs';
import { Button } from '@/components/ui/Button';
import { RpeGuide } from './RpeGuide';
import { FieldError, FormError, Input, Label } from '@/components/ui/Field';
import { ExerciseBlock } from './ExerciseBlock';
import {
  addExercise,
  addSet,
  emptyDraft,
  fromLastLog,
  patchSet,
  removeExercise,
  removeSet,
  setExerciseId,
  swapExercise,
  undoSwap,
  toLocalInput,
  validateDraft,
  type Baseline,
  type DraftErrors,
  type DraftLog,
} from './logger-model';

export function WorkoutLogger({
  exercises,
  lastLog,
  unit,
  baselines,
}: {
  exercises: ExerciseDto[];
  lastLog: WorkoutLogDto | null;
  unit: WeightUnit;
  /** Onboarding starting weights by exercise id (kg). */
  baselines: Record<string, Baseline>;
}) {
  // Date is filled after mount: server and browser timezones differ, which would break hydration.
  const [draft, setDraft] = useState<DraftLog>(() => emptyDraft('', unit));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setDraft((d) => (d.performedAtLocal ? d : { ...d, performedAtLocal: toLocalInput(new Date()) }));
  }, []);

  function submit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const result = validateDraft(draft, new Date());
    if (!result.ok) {
      setErrors(result.errors);
      setFormError('Fix the highlighted fields and try again.');
      return;
    }
    setErrors({});
    setFormError(undefined);
    startTransition(async () => {
      const outcome = await createWorkoutLog(result.request);
      if (outcome && !outcome.ok) setFormError(outcome.error);
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="performedAt">Date and time</Label>
          <Input
            id="performedAt"
            type="datetime-local"
            value={draft.performedAtLocal}
            aria-invalid={errors['performedAt'] ? true : undefined}
            aria-describedby={errors['performedAt'] ? 'performedAt-error' : undefined}
            onChange={(e) => setDraft({ ...draft, performedAtLocal: e.target.value })}
          />
          <FieldError id="performedAt-error">{errors['performedAt']}</FieldError>
        </div>
        <div>
          <Label htmlFor="notes">Notes (optional)</Label>
          <Input
            id="notes"
            maxLength={2000}
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <RpeGuide />
      </div>

      {lastLog ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-card p-4">
          <Button
            variant="secondary"
            onClick={() => {
              setDraft(fromLastLog(lastLog, toLocalInput(new Date()), unit));
              setErrors({});
              setFormError(undefined);
            }}
          >
            Repeat last session
          </Button>
          <p className="text-sm text-muted">
            Copies your previous exercises and sets so you only adjust the numbers. Keeps your targets linked.
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        {draft.exercises.map((exercise, i) => (
          <ExerciseBlock
            key={exercise.key}
            exercise={exercise}
            index={i}
            library={exercises}
            unit={unit}
            errors={errors}
            canRemove={draft.exercises.length > 1}
            onExerciseChange={(id) => setDraft(setExerciseId(draft, exercise.key, id, baselines[id]))}
            onSwap={(to, reason, note) => setDraft(swapExercise(draft, exercise.key, to, reason, note))}
            onUndoSwap={() => setDraft(undoSwap(draft, exercise.key))}
            onRemove={() => setDraft(removeExercise(draft, exercise.key))}
            onAddSet={() => setDraft(addSet(draft, exercise.key))}
            onRemoveSet={(setKey) => setDraft(removeSet(draft, exercise.key, setKey))}
            onPatchSet={(setKey, patch) => setDraft(patchSet(draft, exercise.key, setKey, patch))}
          />
        ))}
        <FieldError>{errors['exercises']}</FieldError>
        <Button variant="secondary" onClick={() => setDraft(addExercise(draft))}>
          + Add exercise
        </Button>
      </div>

      <div className="space-y-3">
        <FormError>{formError}</FormError>
        <Button type="submit" disabled={pending} aria-busy={pending} className="w-full sm:w-auto">
          {pending ? 'Saving…' : 'Save session'}
        </Button>
      </div>
    </form>
  );
}
