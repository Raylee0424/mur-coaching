'use client';

import clsx from 'clsx';
import { useState, useTransition, type ReactNode } from 'react';
import { WORKOUT_LOG_LIMITS } from '@coaching/shared';
import type { SetLogDto, WeightUnit, WorkoutLogDto } from '@coaching/shared';
import { deleteWorkoutLog, updateWorkoutLog } from '@/actions/workout-logs';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { toNumber } from '@/lib/format';
import { displayToKg, kgToDisplay, unitLabel, unitStep } from '@/lib/units';
import { applySetEdit, type SetEdit } from './edit-log-model';

const round = (n: number, step: number) => Math.round(n / step) * step;

function Stepper({
  label,
  value,
  display,
  onChange,
  step,
  min,
  max,
  onClear,
}: {
  label: string;
  value: number | null;
  display: string;
  onChange: (n: number) => void;
  step: number;
  min: number;
  max: number;
  onClear?: () => void;
}) {
  const current = value ?? min;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
        {onClear && value !== null ? (
          <button type="button" className="text-xs font-semibold text-primary-soft underline" onClick={onClear}>
            Clear
          </button>
        ) : null}
      </div>
      <div className="flex items-center gap-2" role="group" aria-label={label}>
        <Button
          variant="secondary"
          className="size-12 shrink-0 px-0 text-lg"
          aria-label={`Decrease ${label}`}
          disabled={value !== null && current - step < min - 1e-9}
          onClick={() => onChange(Math.max(min, round(current - step, step)))}
        >
          −
        </Button>
        <output aria-live="polite" className="flex-1 text-center font-display text-2xl font-bold tabular">
          {display}
        </output>
        <Button
          variant="secondary"
          className="size-12 shrink-0 px-0 text-lg"
          aria-label={`Increase ${label}`}
          disabled={current + step > max + 1e-9}
          onClick={() => onChange(Math.min(max, value === null ? min : round(current + step, step)))}
        >
          +
        </Button>
      </div>
    </div>
  );
}

/** A logged set as a button; opens a bottom sheet to correct or delete it (client's own history only). */
export function EditSetButton({
  log,
  set,
  exerciseName,
  unit,
  children,
}: {
  log: WorkoutLogDto;
  set: SetLogDto;
  exerciseName: string;
  unit: WeightUnit;
  children: ReactNode;
}) {
  const initial = () => ({
    weight: kgToDisplay(toNumber(set.weightKg), unit),
    reps: set.reps,
    rpe: set.rpe === null ? null : toNumber(set.rpe),
    isWarmup: set.isWarmup,
  });
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(initial);
  const [confirmSession, setConfirmSession] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const maxWeight = kgToDisplay(WORKOUT_LOG_LIMITS.maxWeightKg, unit);

  function openSheet(): void {
    setV(initial());
    setConfirmSession(false);
    setError(undefined);
    setOpen(true);
  }

  function run(edit: SetEdit): void {
    const outcome = applySetEdit(log, edit);
    if (outcome.kind === 'deleteSession') {
      setConfirmSession(true);
      return;
    }
    startTransition(async () => {
      const r = await updateWorkoutLog(log.id, outcome.body);
      if (r.ok) setOpen(false);
      else setError(r.error);
    });
  }

  function deleteSession(): void {
    startTransition(async () => {
      const r = await deleteWorkoutLog(log.id);
      if (r.ok) setOpen(false);
      else setError(r.error);
    });
  }

  return (
    <li>
      <button
        type="button"
        onClick={openSheet}
        className="-mx-1 min-h-8 rounded px-1 text-left hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        aria-label={`Edit set ${set.setNumber} of ${exerciseName}`}
      >
        {children}
      </button>
      {open ? (
      <Sheet open={open} onClose={() => setOpen(false)} variant="bottom" title={`Edit set ${set.setNumber}`} description={exerciseName}>
        {confirmSession ? (
          <div className="space-y-4">
            <p className="text-sm">This is the last set in the session. Delete the whole session?</p>
            <FormError>{error}</FormError>
            <div className="flex justify-between gap-2">
              <Button variant="secondary" onClick={() => setConfirmSession(false)} disabled={pending}>
                Go back
              </Button>
              <Button variant="danger" onClick={deleteSession} disabled={pending}>
                {pending ? 'Deleting…' : 'Delete session'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <Stepper
              label={`Weight (${unitLabel(unit)})`}
              value={v.weight}
              display={`${v.weight}`}
              step={unitStep(unit)}
              min={0}
              max={maxWeight}
              onChange={(weight) => setV((x) => ({ ...x, weight }))}
            />
            <Stepper
              label="Reps"
              value={v.reps}
              display={`${v.reps}`}
              step={1}
              min={0}
              max={WORKOUT_LOG_LIMITS.maxReps}
              onChange={(reps) => setV((x) => ({ ...x, reps }))}
            />
            <Stepper
              label="RPE"
              value={v.rpe}
              display={v.rpe === null ? '—' : `${v.rpe}`}
              step={0.5}
              min={WORKOUT_LOG_LIMITS.rpeMin}
              max={WORKOUT_LOG_LIMITS.rpeMax}
              onChange={(rpe) => setV((x) => ({ ...x, rpe }))}
              onClear={() => setV((x) => ({ ...x, rpe: null }))}
            />
            <label className="flex min-h-12 items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="size-5 accent-primary"
                checked={v.isWarmup}
                onChange={(e) => setV((x) => ({ ...x, isWarmup: e.target.checked }))}
              />
              Warm-up set (ignored by the engine)
            </label>
            <FormError>{error}</FormError>
            <footer className={clsx('flex justify-between gap-2 border-t border-line pt-4')}>
              <Button variant="danger" onClick={() => run({ setId: set.id, kind: 'delete' })} disabled={pending}>
                Delete set
              </Button>
              <Button
                className="min-h-12"
                disabled={pending}
                onClick={() =>
                  run({
                    setId: set.id,
                    kind: 'save',
                    values: { weightKg: displayToKg(v.weight, unit), reps: v.reps, rpe: v.rpe, isWarmup: v.isWarmup },
                  })
                }
              >
                {pending ? 'Saving…' : 'Save'}
              </Button>
            </footer>
          </div>
        )}
      </Sheet>
      ) : null}
    </li>
  );
}
