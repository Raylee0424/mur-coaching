'use client';

import { useActionState, useEffect, useRef } from 'react';
import { MUSCLE_GROUP_LABELS, MuscleGroup } from '@coaching/shared';
import type { ExerciseDto } from '@coaching/shared';
import { createExercise, updateExercise } from '@/actions/exercises';
import type { ActionResult } from '@/lib/action-result';
import { toNumber } from '@/lib/format';
import { buttonClass } from '@/components/ui/Button';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { SubmitButton } from '@/components/ui/SubmitButton';
import Link from 'next/link';

type Props = { mode: 'create' } | { mode: 'edit'; exercise: ExerciseDto; returnTo: string };

export function ExerciseForm(props: Props) {
  const edit = props.mode === 'edit' ? props.exercise : null;
  const [state, action] = useActionState<ActionResult<string> | null, FormData>(
    props.mode === 'edit' ? updateExercise : createExercise,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const idPrefix = edit ? `ex-${edit.id}` : 'ex-new';

  useEffect(() => {
    if (state?.ok && !edit) formRef.current?.reset();
  }, [state, edit]);

  const initial = edit
    ? {
        name: edit.name,
        muscleGroup: edit.muscleGroup,
        equipment: edit.equipment ?? '',
        loadIncrementKg: String(toNumber(edit.loadIncrementKg)),
      }
    : null;

  return (
    <form ref={formRef} action={action} className="grid gap-4 sm:grid-cols-2">
      {edit && props.mode === 'edit' ? (
        <>
          <input type="hidden" name="id" value={edit.id} />
          <input type="hidden" name="returnTo" value={props.returnTo} />
          {initial
            ? Object.entries(initial).map(([key, value]) => (
                <input key={key} type="hidden" name={`initial_${key}`} value={value} />
              ))
            : null}
        </>
      ) : null}
      <div>
        <Label htmlFor={`${idPrefix}-name`}>Name</Label>
        <Input id={`${idPrefix}-name`} name="name" required maxLength={80} defaultValue={initial?.name ?? ''} />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-muscle`}>Muscle group</Label>
        <Select id={`${idPrefix}-muscle`} name="muscleGroup" required defaultValue={initial?.muscleGroup ?? ''}>
          <option value="" disabled>
            Choose…
          </option>
          {Object.values(MuscleGroup).map((group) => (
            <option key={group} value={group}>
              {MUSCLE_GROUP_LABELS[group]}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-equipment`}>Equipment (optional)</Label>
        <Input id={`${idPrefix}-equipment`} name="equipment" maxLength={60} defaultValue={initial?.equipment ?? ''} />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-inc`}>Load increment (kg)</Label>
        <Input
          id={`${idPrefix}-inc`}
          name="loadIncrementKg"
          type="number"
          inputMode="decimal"
          step={0.25}
          min={0.25}
          max={25}
          defaultValue={initial?.loadIncrementKg ?? '2.5'}
        />
      </div>
      <div className="space-y-3 sm:col-span-2">
        <FormError>{state?.ok === false ? state.error : undefined}</FormError>
        {state?.ok && !edit ? (
          <p role="status" className="text-ui text-emerald">
            Added “{state.data}”.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <SubmitButton pendingLabel="Saving…">{edit ? 'Save changes' : 'Add exercise'}</SubmitButton>
          {props.mode === 'edit' ? (
            <Link href={props.returnTo} className={buttonClass('secondary')}>
              Cancel
            </Link>
          ) : null}
        </div>
      </div>
    </form>
  );
}
