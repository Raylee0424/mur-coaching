'use client';

import { useState, useTransition, type ReactNode } from 'react';
import type { SetLogDto, WeightUnit, WorkoutLogDto } from '@coaching/shared';
import { deleteWorkoutLog, updateWorkoutLog } from '@/actions/workout-logs';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Field';
import { toNumber } from '@/lib/format';
import { displayToKg, kgToDisplay, unitStep } from '@/lib/units';
import { applySetEdit, type SetEdit } from './edit-log-model';
import { SetEditorSheet } from './SetEditorSheet';

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
  const [open, setOpen] = useState(false);
  const [confirmSession, setConfirmSession] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function openSheet(): void {
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
        className="-mx-1 flex min-h-11 w-full items-center rounded px-1 text-left hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        aria-label={`Edit set ${set.setNumber} of ${exerciseName}`}
      >
        {children}
      </button>
      {open ? (
        <SetEditorSheet
          title={`Set ${set.setNumber} · ${exerciseName}`}
          description="Edit logged set"
          unit={unit}
          initial={{
            weight: kgToDisplay(toNumber(set.weightKg), unit),
            reps: set.reps,
            rpe: set.rpe === null ? null : toNumber(set.rpe),
            isWarmup: set.isWarmup,
          }}
          weightStep={unitStep(unit)}
          rpeMin={1}
          allowClearRpe
          showWarmup
          pending={pending}
          error={error}
          onClose={() => setOpen(false)}
          onSave={(v) =>
            run({
              setId: set.id,
              kind: 'save',
              values: { weightKg: displayToKg(v.weight, unit), reps: v.reps, rpe: v.rpe, isWarmup: v.isWarmup },
            })
          }
          onDelete={() => run({ setId: set.id, kind: 'delete' })}
          override={
            confirmSession ? (
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
            ) : undefined
          }
        />
      ) : null}
    </li>
  );
}
