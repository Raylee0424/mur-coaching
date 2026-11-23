'use client';

import clsx from 'clsx';
import { Archive, Copy, Pencil, Plus } from 'lucide-react';
import { useId, useState, useTransition, type ReactNode } from 'react';
import {
  ENGINE_LIMITS,
  EQUIPMENT_LABELS,
  EXERCISE_POSITION_LABELS,
  Equipment,
  ExercisePosition,
  MOVEMENT_PATTERN_LABELS,
  MUSCLE_GROUP_LABELS,
  MovementPattern,
  MuscleGroup,
  MuscleRole,
  RESISTANCE_PROFILE_LABELS,
  ResistanceProfile,
} from '@coaching/shared';
import type { ExerciseDto } from '@coaching/shared';
import { archiveExercise, duplicateExercise, saveExercise } from '@/actions/exercises';
import { LimitationBadge } from '@/components/limitations/LimitationBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FieldError, FormError, Input, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { TABLE, TD, TD_NUM, TH, THEAD, TR } from '@/components/ui/table';
import { useToast } from '@/components/ui/Toast';
import { toNumber } from '@/lib/format';
import {
  EMPTY_DRAFT,
  draftFromExercise,
  formatMuscles,
  formatOverrides,
  formatRepRange,
  isOwnExercise,
  nextMuscleRole,
  validateExercise,
  type ExerciseDraft,
  type ExerciseErrors,
  type LibraryViewer,
} from './exercise-model';

type Editing = { mode: 'new' } | { mode: 'edit'; exercise: ExerciseDto };

/**
 * One exercise library for coaches (`C/exercises`) and athletes (`A/exercises`). The viewer picks the columns:
 * coaches see engine rules and override counts; athletes see today's limitation status. Each edits only their own rows.
 * The page renders the header; `filters` and the "New exercise" button sit above the table.
 */
export function ExerciseLibrary({
  exercises,
  viewer,
  userId,
  filtered,
  filters,
}: {
  exercises: ExerciseDto[];
  viewer: LibraryViewer;
  userId: string;
  filtered: boolean;
  filters?: ReactNode;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<ExerciseDto | null>(null);
  const [pending, startTransition] = useTransition();
  const coach = viewer === 'coach';

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
  const sourceBadge = (e: ExerciseDto): ReactNode => {
    if (isOwnExercise(e, viewer, userId)) return coach ? null : <Badge tone="signal">Custom</Badge>;
    if (e.coachId) return <Badge tone="slate">Coach</Badge>;
    return coach ? <Badge tone="slate">Global</Badge> : null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">{filters}</div>
        <Button size="sm" onClick={() => setEditing({ mode: 'new' })}>
          <Icon icon={Plus} />
          New exercise
        </Button>
      </div>
      <p className="font-mono text-meta text-faint">
        {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
      </p>
      {exercises.length === 0 ? (
        <EmptyState title={filtered ? 'No exercises match' : 'No exercises yet'}>
          {filtered ? 'Try clearing the filters.' : coach ? 'Add your first exercise to start building programs.' : 'Add your own exercise to log it.'}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-md border border-line bg-card">
          <table className={clsx(TABLE, coach ? 'min-w-[60rem]' : 'min-w-[40rem]')}>
            <caption className="sr-only">Exercise library</caption>
            <thead className={THEAD}>
              <tr>
                <th scope="col" className={TH}>Exercise</th>
                <th scope="col" className={TH}>Muscles</th>
                <th scope="col" className={TH}>Equipment</th>
                {coach ? (
                  <>
                    <th scope="col" className={clsx(TH, 'text-right')}>Increment</th>
                    <th scope="col" className={clsx(TH, 'text-right')}>RPE cap</th>
                    <th scope="col" className={clsx(TH, 'text-right')}>Rep range</th>
                    <th scope="col" className={clsx(TH, 'text-right')}>Overrides</th>
                  </>
                ) : (
                  <th scope="col" className={TH}>Status</th>
                )}
                <th scope="col" className={TH}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {exercises.map((e) => {
                const own = isOwnExercise(e, viewer, userId);
                return (
                  <tr key={e.id} className={TR}>
                    <td className={clsx(TD, 'h-auto py-2')}>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{e.name}</span>
                        {sourceBadge(e)}
                      </span>
                    </td>
                    <td className={clsx(TD, 'h-auto py-2')}>
                      <span className="block">{formatMuscles(e, 'primary')}</span>
                      {e.muscles.some((m) => m.role === MuscleRole.SECONDARY) ? (
                        <span className="block text-meta text-muted">
                          + {e.muscles.filter((m) => m.role === MuscleRole.SECONDARY).map((m) => MUSCLE_GROUP_LABELS[m.muscle]).join(', ')}
                        </span>
                      ) : null}
                    </td>
                    <td className={clsx(TD, 'text-muted')}>{e.equipment ? EQUIPMENT_LABELS[e.equipment] : <span className="text-faint">—</span>}</td>
                    {coach ? (
                      <>
                        <td className={TD_NUM}>+{toNumber(e.loadIncrementKg)} kg</td>
                        <td className={clsx(TD_NUM, e.rpeCap === null && 'text-faint')} title={e.rpeCap === null ? 'Inherits engine rule' : undefined}>
                          {e.rpeCap === null ? '—' : toNumber(e.rpeCap)}
                        </td>
                        <td className={clsx(TD_NUM, formatRepRange(e) === '—' && 'text-faint')}>{formatRepRange(e)}</td>
                        <td className={clsx(TD_NUM, e.overrideClientCount === 0 && 'text-faint')}>{formatOverrides(e.overrideClientCount)}</td>
                      </>
                    ) : (
                      <td className={TD}>{e.limitation ? <LimitationBadge flag={e.limitation} /> : <Badge tone="emerald">Clear</Badge>}</td>
                    )}
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

      {editing ? <ExerciseDrawer editing={editing} viewer={viewer} onClose={() => setEditing(null)} /> : null}

      {deleting ? (
        <Sheet
          open
          onClose={() => setDeleting(null)}
          title="Archive exercise?"
          description={`Archiving “${deleting.name}” removes it from the library${coach ? ' and archives its progression rules' : ''}. Logged history remains intact.`}
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
  );
}

const ROLE_LABEL: Record<MuscleRole, string> = { PRIMARY: 'primary', SECONDARY: 'secondary' };

function ExerciseDrawer({ editing, viewer, onClose }: { editing: Editing; viewer: LibraryViewer; onClose: () => void }) {
  const id = useId();
  const toast = useToast();
  const coach = viewer === 'coach';
  const exercise = editing.mode === 'edit' ? editing.exercise : null;
  const [draft, setDraft] = useState<ExerciseDraft>(() => (exercise ? draftFromExercise(exercise) : EMPTY_DRAFT));
  const [errors, setErrors] = useState<ExerciseErrors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();

  type Field = keyof ExerciseErrors;
  const bind = (key: Field) => ({
    id: `${id}-${key}`,
    value: draft[key],
    'aria-invalid': errors[key] ? (true as const) : undefined,
    'aria-describedby': errors[key] ? `${id}-${key}-error` : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setDraft((d) => ({ ...d, [key]: e.target.value }));
      setErrors((errs) => ({ ...errs, [key]: undefined }));
    },
  });

  function toggleMuscle(m: MuscleGroup): void {
    setDraft((d) => {
      const role = nextMuscleRole(d.extraMuscles[m]);
      const extraMuscles = { ...d.extraMuscles };
      if (role) extraMuscles[m] = role;
      else delete extraMuscles[m];
      return { ...d, extraMuscles };
    });
  }

  function save(): void {
    const v = validateExercise(draft, viewer);
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

  const err = (key: Field) => <FieldError id={`${id}-${key}-error`}>{errors[key]}</FieldError>;
  const enumSelect = <T extends string>(key: 'equipment' | 'pattern' | 'profile' | 'position', label: string, values: readonly T[], labels: Record<T, string>) => (
    <div>
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <Select {...bind(key)}>
        <option value="">Not set</option>
        {values.map((v) => (
          <option key={v} value={v}>
            {labels[v]}
          </option>
        ))}
      </Select>
    </div>
  );

  return (
    <Sheet
      open
      variant="drawer"
      onClose={onClose}
      title={exercise ? 'Edit exercise' : coach ? 'New exercise' : 'Custom exercise'}
      description={coach ? 'Empty rule fields inherit your engine rules.' : 'Saved to your own library. Tag the movement pattern so joint limitations can flag it.'}
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
            {pending ? 'Saving…' : coach ? 'Save exercise' : 'Add to library'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <Label htmlFor={`${id}-name`}>Exercise name</Label>
          <Input {...bind('name')} maxLength={80} autoComplete="off" placeholder="e.g. Chest-supported T-bar row" />
          {err('name')}
        </div>
        <div>
          <Label htmlFor={`${id}-muscleGroup`}>Main muscle</Label>
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
        <fieldset aria-describedby={`${id}-tags-hint`}>
          <legend className="mb-1.5 font-mono text-micro uppercase text-muted">Other muscles</legend>
          <p id={`${id}-tags-hint`} className="mb-2 text-meta text-muted">
            Tap once for secondary, twice for primary, again to clear.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Object.values(MuscleGroup)
              .filter((m) => m !== draft.muscleGroup)
              .map((m) => {
                const role = draft.extraMuscles[m];
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMuscle(m)}
                    aria-label={`${MUSCLE_GROUP_LABELS[m]}: ${role ? ROLE_LABEL[role] : 'not trained'}`}
                    className={clsx(
                      'min-h-9 rounded-full border px-3 text-meta transition-colors',
                      role === MuscleRole.PRIMARY && 'border-signal bg-signal-bg text-signal',
                      role === MuscleRole.SECONDARY && 'border-line-strong bg-raised text-ink',
                      !role && 'border-line bg-canvas-low text-muted hover:text-ink',
                    )}
                  >
                    {MUSCLE_GROUP_LABELS[m]}
                    {role ? <span className="ml-1 font-mono text-micro uppercase">{role === MuscleRole.PRIMARY ? '1°' : '2°'}</span> : null}
                  </button>
                );
              })}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          {enumSelect('equipment', 'Equipment', Object.values(Equipment), EQUIPMENT_LABELS)}
          {enumSelect('pattern', 'Movement pattern', Object.values(MovementPattern), MOVEMENT_PATTERN_LABELS)}
          {enumSelect('profile', 'Resistance profile', Object.values(ResistanceProfile), RESISTANCE_PROFILE_LABELS)}
          {enumSelect('position', 'Position', Object.values(ExercisePosition), EXERCISE_POSITION_LABELS)}
        </div>
        {coach ? (
          <>
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
          </>
        ) : null}
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
