'use client';

import clsx from 'clsx';
import { Archive, Copy, Pencil, Plus } from 'lucide-react';
import { useId, useState, useTransition, type ReactNode } from 'react';
import { ENGINE_LIMITS, MUSCLE_GROUP_LABELS, MuscleGroup } from '@coaching/shared';
import type { ExerciseDto } from '@coaching/shared';
import { archiveExercise, duplicateExercise, saveExercise } from '@/actions/exercises';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FieldError, FormError, Input, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { Sheet } from '@/components/ui/Sheet';
import { TABLE, TD, TD_NUM, TH, THEAD, TR } from '@/components/ui/table';
import { useToast } from '@/components/ui/Toast';
import { toNumber } from '@/lib/format';
import { EMPTY_DRAFT, draftFromExercise, formatOverrides, formatRepRange, validateExercise, type ExerciseDraft, type ExerciseErrors } from './exercise-model';

type Editing = { mode: 'new' } | { mode: 'edit'; exercise: ExerciseDto };

export function ExerciseLibrary({
  exercises,
  coachId,
  filtered,
  filters,
}: {
  exercises: ExerciseDto[];
  coachId: string;
  filtered: boolean;
  filters?: ReactNode;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<ExerciseDto | null>(null);
  const [pending, startTransition] = useTransition();

  function duplicate(e: ExerciseDto): void {
    startTransition(async () => {
      const r = await duplicateExercise(e.id);
      toast.show(r.ok ? { message: `Duplicated as ${r.data.name}`, tone: 'ok' } : { message: r.error, tone: 'error' });
    });
  }

  function remove(): void {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const r = await archiveExercise(target.id);
      setDeleting(null);
      toast.show(r.ok ? { message: `Archived ${target.name}`, tone: 'ok' } : { message: r.error, tone: 'error' });
    });
  }

  const iconBtn = 'w-8 px-0';

  return (
    <>
      <PageHeader
        title="Exercise library"
        meta={`${exercises.length} ${exercises.length === 1 ? 'exercise' : 'exercises'}`}
        actions={
          <Button size="sm" onClick={() => setEditing({ mode: 'new' })}>
            <Icon icon={Plus} />
            New exercise
          </Button>
        }
      />
      <div className="space-y-4">
        {filters}
        {exercises.length === 0 ? (
          <EmptyState title={filtered ? 'No exercises match' : 'No exercises yet'}>
            {filtered ? 'Try clearing the filters.' : 'Add your first exercise to start building programs.'}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-md border border-line bg-card">
            <table className={clsx(TABLE, 'min-w-[56rem]')}>
              <caption className="sr-only">Exercise library</caption>
              <thead className={THEAD}>
                <tr>
                  <th scope="col" className={TH}>Name</th>
                  <th scope="col" className={TH}>Muscle</th>
                  <th scope="col" className={TH}>Equipment</th>
                  <th scope="col" className={clsx(TH, 'text-right')}>Increment</th>
                  <th scope="col" className={clsx(TH, 'text-right')}>RPE cap</th>
                  <th scope="col" className={clsx(TH, 'text-right')}>Rep range</th>
                  <th scope="col" className={clsx(TH, 'text-right')}>Overrides</th>
                  <th scope="col" className={TH}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {exercises.map((e) => {
                  const own = e.coachId === coachId;
                  return (
                    <tr key={e.id} className={TR}>
                      <td className={TD}>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{e.name}</span>
                          {!own ? <Badge tone="slate">Global</Badge> : null}
                        </span>
                      </td>
                      <td className={TD}>{MUSCLE_GROUP_LABELS[e.muscleGroup]}</td>
                      <td className={clsx(TD, 'text-muted')}>{e.equipment || <span className="text-faint">—</span>}</td>
                      <td className={TD_NUM}>+{toNumber(e.loadIncrementKg)} kg</td>
                      <td className={clsx(TD_NUM, e.rpeCap === null && 'text-faint')} title={e.rpeCap === null ? 'Inherits engine rule' : undefined}>
                        {e.rpeCap === null ? '—' : toNumber(e.rpeCap)}
                      </td>
                      <td className={clsx(TD_NUM, formatRepRange(e) === '—' && 'text-faint')}>{formatRepRange(e)}</td>
                      <td className={clsx(TD_NUM, e.overrideClientCount === 0 && 'text-faint')}>{e.overrideClientCount}</td>
                      <td className={TD}>
                        <div className="flex justify-end gap-1">
                          {own ? (
                            <Button variant="ghost" size="sm" className={iconBtn} aria-label={`Edit ${e.name}`} onClick={() => setEditing({ mode: 'edit', exercise: e })}>
                              <Icon icon={Pencil} />
                            </Button>
                          ) : null}
                          <Button variant="ghost" size="sm" className={iconBtn} aria-label={`Duplicate ${e.name}`} disabled={pending} onClick={() => duplicate(e)}>
                            <Icon icon={Copy} />
                          </Button>
                          {own ? (
                            <Button variant="ghost" size="sm" className={iconBtn} aria-label={`Archive ${e.name}`} onClick={() => setDeleting(e)}>
                              <Icon icon={Archive} />
                            </Button>
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

        {editing ? <ExerciseDrawer editing={editing} onClose={() => setEditing(null)} /> : null}

        {deleting ? (
          <Sheet
            open
            onClose={() => setDeleting(null)}
            title="Archive exercise?"
            description={`Archiving “${deleting.name}” removes it from the library and archives its progression rules. Historical client logs remain intact.`}
            footer={
              <>
                <Button variant="ghost" onClick={() => setDeleting(null)} disabled={pending}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={remove} disabled={pending}>
                  {pending ? 'Archiving…' : 'Archive'}
                </Button>
              </>
            }
          >
            <p className="text-ui text-muted">This cannot be undone from here.</p>
          </Sheet>
        ) : null}
      </div>
    </>
  );
}

function ExerciseDrawer({ editing, onClose }: { editing: Editing; onClose: () => void }) {
  const id = useId();
  const toast = useToast();
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
        toast.show({ message: exercise ? `Saved ${r.data.name}` : `Added ${r.data.name}`, tone: 'ok' });
        onClose();
      } else setFormError(r.error);
    });
  }

  const err = (key: keyof ExerciseDraft) => <FieldError id={`${id}-${key}-error`}>{errors[key]}</FieldError>;

  return (
    <Sheet
      open
      variant="drawer"
      onClose={onClose}
      title={exercise ? 'Edit exercise' : 'New exercise'}
      description="Empty rule fields inherit your engine rules."
      form={{
        noValidate: true,
        onSubmit: (e) => {
          e.preventDefault();
          save();
        },
      }}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save exercise'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
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
          <legend className="mb-1.5 font-mono text-micro uppercase text-muted">Target rep range</legend>
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
          <p className="border-l-2 border-l-ink bg-raised px-3 py-2 text-meta text-muted">
            {formatOverrides(exercise.overrideClientCount)} have their own engine overrides, which take precedence over these rules.
          </p>
        ) : null}
        <FormError>{formError}</FormError>
      </div>
    </Sheet>
  );
}
