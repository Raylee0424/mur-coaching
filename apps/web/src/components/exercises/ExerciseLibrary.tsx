'use client';

import { useId, useState, useTransition } from 'react';
import { ENGINE_LIMITS, MUSCLE_GROUP_LABELS, MuscleGroup } from '@coaching/shared';
import type { ExerciseDto } from '@coaching/shared';
import { archiveExercise, duplicateExercise, saveExercise } from '@/actions/exercises';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FieldError, FormError, Input, Label, Select } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { toNumber } from '@/lib/format';
import { EMPTY_DRAFT, draftFromExercise, formatOverrides, formatRepRange, validateExercise, type ExerciseDraft, type ExerciseErrors } from './exercise-model';

type Editing = { mode: 'new' } | { mode: 'edit'; exercise: ExerciseDto };

export function ExerciseLibrary({ exercises, coachId, filtered }: { exercises: ExerciseDto[]; coachId: string; filtered: boolean }) {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<ExerciseDto | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function duplicate(e: ExerciseDto): void {
    setNotice(null);
    startTransition(async () => {
      const r = await duplicateExercise(e.id);
      setNotice(r.ok ? { kind: 'ok', text: `Created “${r.data.name}”. Edit it to set its rules.` } : { kind: 'error', text: r.error });
    });
  }

  function remove(): void {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const r = await archiveExercise(target.id);
      setDeleting(null);
      setNotice(r.ok ? { kind: 'ok', text: `Deleted “${target.name}”. Logs and programs that use it are unchanged.` } : { kind: 'error', text: r.error });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Configure progression increments, RPE caps and target rep ranges per movement.</p>
        <Button onClick={() => setEditing({ mode: 'new' })}>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 4v12M4 10h12" />
          </svg>
          New exercise
        </Button>
      </div>

      <p role="status" aria-live="polite" className={notice?.kind === 'error' ? 'min-h-5 text-sm font-medium text-danger' : 'min-h-5 text-sm font-medium text-emerald'}>
        {notice?.text}
      </p>

      {exercises.length === 0 ? (
        <EmptyState title={filtered ? 'No exercises match' : 'No exercises yet'}>
          {filtered ? 'Try clearing the filters.' : 'Add your first exercise to start building programs.'}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-card">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <caption className="sr-only">Exercise library</caption>
            <thead className="border-b border-line bg-raised text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Exercise name</th>
                <th scope="col" className="px-3 py-3 font-semibold">Muscle group</th>
                <th scope="col" className="px-3 py-3 font-semibold">Equipment</th>
                <th scope="col" className="px-3 py-3 font-semibold">Increment</th>
                <th scope="col" className="px-3 py-3 font-semibold">RPE cap</th>
                <th scope="col" className="px-3 py-3 font-semibold">Rep range</th>
                <th scope="col" className="px-3 py-3 font-semibold">Overrides</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {exercises.map((e) => {
                const own = e.coachId === coachId;
                return (
                  <tr key={e.id} className="border-b border-line last:border-0 hover:bg-raised/40">
                    <td className="px-4 py-3">
                      <span className="font-semibold">{e.name}</span>
                      {!own ? (
                        <span className="mt-1 block whitespace-nowrap">
                          <Badge tone="slate">Global</Badge>
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">{MUSCLE_GROUP_LABELS[e.muscleGroup]}</td>
                    <td className="px-3 py-3">{e.equipment || '—'}</td>
                    <td className="px-3 py-3">+{toNumber(e.loadIncrementKg)} kg</td>
                    <td className="px-3 py-3">{e.rpeCap === null ? <span className="text-muted">—</span> : toNumber(e.rpeCap)}</td>
                    <td className="px-3 py-3">{formatRepRange(e)}</td>
                    <td className="px-3 py-3">
                      {e.overrideClientCount > 0 ? (
                        <span className="whitespace-nowrap">
                          <Badge tone="neutral">{formatOverrides(e.overrideClientCount)}</Badge>
                        </span>
                      ) : (
                        <span className="text-muted">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" className="min-h-9 py-1" aria-label={`Duplicate ${e.name}`} disabled={pending} onClick={() => duplicate(e)}>
                          Duplicate
                        </Button>
                        {own ? (
                          <>
                            <Button variant="secondary" className="min-h-9 py-1" aria-label={`Edit ${e.name}`} onClick={() => setEditing({ mode: 'edit', exercise: e })}>
                              Edit
                            </Button>
                            <Button variant="secondary" className="min-h-9 py-1 text-danger" aria-label={`Delete ${e.name}`} onClick={() => setDeleting(e)}>
                              Delete
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing ? <ExerciseDrawer editing={editing} onClose={() => setEditing(null)} onSaved={(text) => setNotice({ kind: 'ok', text })} /> : null}

      {deleting ? (
        <Sheet
          open
          onClose={() => setDeleting(null)}
          title="Delete exercise?"
          description={`Removing “${deleting.name}” from the library archives its progression rules. Historical client logs remain intact.`}
        >
          <footer className="flex justify-between gap-2">
            <Button variant="secondary" onClick={() => setDeleting(null)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove} disabled={pending}>
              {pending ? 'Deleting…' : 'Delete'}
            </Button>
          </footer>
        </Sheet>
      ) : null}
    </div>
  );
}

function ExerciseDrawer({ editing, onClose, onSaved }: { editing: Editing; onClose: () => void; onSaved: (text: string) => void }) {
  const id = useId();
  const exercise = editing.mode === 'edit' ? editing.exercise : null;
  const [draft, setDraft] = useState<ExerciseDraft>(() => (exercise ? draftFromExercise(exercise) : EMPTY_DRAFT));
  const [errors, setErrors] = useState<ExerciseErrors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const bind = (key: keyof ExerciseDraft) => ({
    id: `${id}-${key}`,
    value: draft[key],
    'aria-invalid': errors[key] ? (true as const) : undefined,
    'aria-describedby': errors[key] ? `${id}-${key}-error` : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setDraft((d) => ({ ...d, [key]: e.target.value }));
      setErrors((errs) => ({ ...errs, [key]: undefined }));
    },
  });

  function save(): void {
    const v = validateExercise(draft);
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    setFormError(undefined);
    startTransition(async () => {
      const r = await saveExercise(exercise?.id ?? null, v.body);
      if (r.ok) {
        onSaved(exercise ? `Saved “${r.data.name}”.` : `Added “${r.data.name}”.`);
        onClose();
      } else setFormError(r.error);
    });
  }

  const err = (key: keyof ExerciseDraft) => <FieldError id={`${id}-${key}-error`}>{errors[key]}</FieldError>;

  return (
    <Sheet open variant="drawer" onClose={onClose} title={exercise ? 'Edit exercise' : 'New exercise'} description="Empty rule fields inherit your engine rules.">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        noValidate
      >
        <div>
          <Label htmlFor={`${id}-name`}>Exercise name</Label>
          <Input {...bind('name')} maxLength={80} autoComplete="off" />
          {err('name')}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={`${id}-muscleGroup`}>Muscle group</Label>
            <Select {...bind('muscleGroup')}>
              <option value="" disabled>
                Choose…
              </option>
              {Object.values(MuscleGroup).map((g) => (
                <option key={g} value={g}>
                  {MUSCLE_GROUP_LABELS[g]}
                </option>
              ))}
            </Select>
            {err('muscleGroup')}
          </div>
          <div>
            <Label htmlFor={`${id}-equipment`}>Equipment (optional)</Label>
            <Input {...bind('equipment')} maxLength={60} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={`${id}-loadIncrementKg`}>Increment (kg)</Label>
            <Input {...bind('loadIncrementKg')} type="number" inputMode="decimal" step={ENGINE_LIMITS.loadIncrementKg.step} min={ENGINE_LIMITS.loadIncrementKg.min} max={ENGINE_LIMITS.loadIncrementKg.max} />
            {err('loadIncrementKg')}
          </div>
          <div>
            <Label htmlFor={`${id}-rpeCap`}>RPE cap ({ENGINE_LIMITS.rpeCap.min.toFixed(1)}–{ENGINE_LIMITS.rpeCap.max.toFixed(1)})</Label>
            <Input {...bind('rpeCap')} type="number" inputMode="decimal" step={ENGINE_LIMITS.rpeCap.step} placeholder="Inherit" />
            {err('rpeCap')}
          </div>
        </div>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Target rep range</legend>
          <div>
            <Label htmlFor={`${id}-repsMin`} className="sr-only">Reps min</Label>
            <Input {...bind('repsMin')} type="number" inputMode="numeric" min={1} max={50} step={1} placeholder="Min" />
            {err('repsMin')}
          </div>
          <div>
            <Label htmlFor={`${id}-repsMax`} className="sr-only">Reps max</Label>
            <Input {...bind('repsMax')} type="number" inputMode="numeric" min={1} max={50} step={1} placeholder="Max" />
            {err('repsMax')}
          </div>
        </fieldset>
        {exercise && exercise.overrideClientCount > 0 ? (
          <p className="rounded-md bg-raised px-3 py-2 text-xs text-muted">
            {formatOverrides(exercise.overrideClientCount)} have their own engine overrides, which take precedence over these rules.
          </p>
        ) : null}
        <FormError>{formError}</FormError>
        <footer className="flex justify-between gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save exercise'}
          </Button>
        </footer>
      </form>
    </Sheet>
  );
}
