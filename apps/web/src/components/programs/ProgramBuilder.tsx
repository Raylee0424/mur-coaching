'use client';

import clsx from 'clsx';
import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { PROGRAM_LIMITS } from '@coaching/shared';
import type { ClientGroupDto, ClientProgramConflictsDto, ExerciseDto, ProgramDto, SportCategoryDto } from '@coaching/shared';
import { deleteProgram, saveAsTemplate, saveProgram } from '@/actions/programs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, Panel } from '@/components/ui/Card';
import { FieldError, FormError, Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { AssignProgramButton, type AssignableClient } from './AssignProgramButton';
import {
  addDay,
  addExercise,
  copyWeekToAll,
  daysOfWeek,
  duplicateDay,
  emptyProgram,
  fingerprint,
  freeDayNumbers,
  fromProgram,
  moveExercise,
  patchDay,
  patchExercise,
  removeDay,
  removeExercise,
  setDuration,
  toInput,
  type BuilderErrors,
  type ProgramDraft,
} from './builder-model';
import { DayCard } from './DayCard';
import { ExercisePicker } from './ExercisePicker';
import { PeriodizationPanel } from './PeriodizationPanel';
import { blockTone, weekBlock } from './periodization-model';
import { ProgramConflicts } from './ProgramConflicts';
import { ShareLinkButton } from './ShareLinkButton';
import { SportPicker } from './SportPicker';

interface Props {
  program: ProgramDto | null;
  library: ExerciseDto[];
  clients: AssignableClient[];
  /** Saved program vs. actively assigned clients' limitations (advisory). */
  conflicts?: ClientProgramConflictsDto[];
  /** Sport catalog for the tag picker. */
  sports?: SportCategoryDto[];
  /** The coach's saved client groups, for bulk assignment. */
  groups?: ClientGroupDto[];
}

export function ProgramBuilder({ program, library, clients, conflicts = [], sports = [], groups = [] }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saved, setSaved] = useState<ProgramDto | null>(program);
  const [draft, setDraft] = useState<ProgramDraft>(() => (program ? fromProgram(program) : emptyProgram()));
  const [baseline, setBaseline] = useState(() => fingerprint(program ? fromProgram(program) : emptyProgram()));
  const [week, setWeek] = useState(1);
  const [activeDay, setActiveDay] = useState<string | null>(() => (program ? daysOfWeek(fromProgram(program), 1)[0]?.key ?? null : null));
  const [errors, setErrors] = useState<BuilderErrors>({});
  const [formError, setFormError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = fingerprint(draft) !== baseline;
  const weekDays = daysOfWeek(draft, week);
  const active = draft.days.find((d) => d.key === activeDay) ?? null;
  const weeks = useMemo(() => Array.from({ length: draft.durationWeeks }, (_, i) => i + 1), [draft.durationWeeks]);
  const block = weekBlock(draft.mesocycles, week);
  const affected = saved ? clients.filter((c) => saved.activeClientIds.includes(c.id)) : [];

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const update = (next: ProgramDraft) => {
    setDraft(next);
  };

  function selectWeek(w: number): void {
    setWeek(w);
    setActiveDay(daysOfWeek(draft, w)[0]?.key ?? null);
  }

  function save(asTemplate = false): void {
    const r = toInput(draft);
    if (!r.ok) {
      setErrors(r.errors);
      setFormError('Fix the highlighted fields.');
      return;
    }
    setErrors({});
    setFormError(undefined);
    startTransition(async () => {
      const result = await saveProgram(saved?.id ?? null, asTemplate ? { ...r.input, isTemplate: true } : r.input);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      // Reload from the server copy so new rows carry their ids into the next save.
      const next = fromProgram(result.data);
      setSaved(result.data);
      setDraft(next);
      setBaseline(fingerprint(next));
      setActiveDay(daysOfWeek(next, week)[0]?.key ?? null);
      toast.show({ message: asTemplate ? 'Saved as a template' : 'Program saved', tone: 'ok' });
      if (!saved) router.replace(`/coach/programs/${result.data.id}`);
    });
  }

  function copyAsTemplate(): void {
    if (!saved) return;
    setFormError(undefined);
    startTransition(async () => {
      const result = await saveAsTemplate(saved.id);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      toast.show({
        message: `Saved a template copy: ${result.data.name}`,
        tone: 'ok',
        action: { label: 'Open', onAction: () => router.push(`/coach/programs/${result.data.id}`) },
      });
    });
  }

  function remove(): void {
    if (!saved) return;
    startTransition(async () => {
      const r = await deleteProgram(saved.id);
      if (!r.ok) {
        setFormError(r.error);
        setConfirmDelete(false);
      }
    });
  }

  const assignBlocked = !saved ? 'Save the program first' : dirty ? 'Save your changes first' : null;

  const addedNames = new Set(active?.exercises.map((e) => e.exerciseName) ?? []);

  return (
    <div className="space-y-6">
      <ProgramConflicts conflicts={conflicts} note={dirty ? 'Checked against the last saved version. Save to re-check.' : 'Flags are advisory: clients see them on Today and in the logger, and swaps sort safest first.'} />
      <Panel
        title="Program"
        meta={saved ? (dirty ? 'Unsaved changes' : `${saved.activeClientIds.length} active clients`) : dirty ? 'Unsaved changes' : undefined}
        actions={
          <>
            {saved?.isTemplate ? <Badge tone="neutral">Template</Badge> : null}
            {saved ? (
              <AssignProgramButton programId={saved.id} programName={saved.name} clients={clients} groups={groups} affectedClientIds={saved.activeClientIds} disabledReason={assignBlocked} />
            ) : null}
            {saved ? <ShareLinkButton programId={saved.id} active={saved.shareActive} disabledReason={assignBlocked} /> : null}
            {!saved ? (
              <Button variant="secondary" size="sm" onClick={() => save(true)} disabled={pending}>
                Save as template
              </Button>
            ) : !saved.isTemplate ? (
              <Button variant="secondary" size="sm" onClick={copyAsTemplate} disabled={pending || dirty} title={dirty ? 'Save your changes first' : undefined}>
                Save as template
              </Button>
            ) : null}
            {saved && saved.activeClientIds.length === 0 ? (
              <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)} disabled={pending}>
                <Icon icon={Trash2} />
                Delete
              </Button>
            ) : null}
            <Button size="sm" onClick={() => save()} disabled={pending || (!dirty && saved !== null)}>
              {pending ? 'Saving…' : saved ? 'Save changes' : 'Save program'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 p-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_8rem_1.5fr]">
            <div>
              <Label htmlFor="program-name">Program name</Label>
              <Input
                id="program-name"
                value={draft.name}
                maxLength={100}
                placeholder="e.g. 4-day powerbuilding"
                onChange={(e) => update({ ...draft, name: e.target.value })}
                aria-invalid={errors.name ? true : undefined}
              />
              <FieldError>{errors.name}</FieldError>
            </div>
            <div>
              <Label htmlFor="program-weeks">Weeks</Label>
              <Input
                id="program-weeks"
                type="number"
                inputMode="numeric"
                min={1}
                max={PROGRAM_LIMITS.maxWeeks}
                value={draft.durationWeeks}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n) || n < 1) return;
                  const next = setDuration(draft, n);
                  update(next);
                  if (week > next.durationWeeks) selectWeek(next.durationWeeks);
                }}
              />
            </div>
            <div>
              <Label htmlFor="program-desc">Description (optional)</Label>
              <Input id="program-desc" maxLength={1000} value={draft.description} onChange={(e) => update({ ...draft, description: e.target.value })} />
            </div>
          </div>
          {sports.length > 0 ? <SportPicker sports={sports} selected={draft.sportIds} onChange={(sportIds) => update({ ...draft, sportIds })} /> : null}
          {affected.length > 0 ? (
            <p role="status" className="inline-flex items-center gap-2 rounded-full border border-emerald/40 bg-emerald-bg px-3.5 py-1.5 font-sans text-label-sm text-emerald">
              <span className="size-2 rounded-full bg-emerald" aria-hidden="true" />
              Live synced · saving updates future sessions of {affected.length} {affected.length === 1 ? 'athlete' : 'athletes'} ({affected.map((c) => c.name).join(', ')}). Logged sessions never change.
            </p>
          ) : null}
          <FormError>{formError}</FormError>
        </div>
      </Panel>

      <PeriodizationPanel
        mesocycles={draft.mesocycles}
        durationWeeks={draft.durationWeeks}
        week={week}
        errors={errors}
        onSelectWeek={selectWeek}
        onChange={(mesocycles) => update({ ...draft, mesocycles })}
      />

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div>
          <div role="tablist" aria-label="Weeks" aria-orientation="vertical" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {weeks.map((w) => (
              <button
                key={w}
                role="tab"
                type="button"
                aria-selected={w === week}
                onClick={() => selectWeek(w)}
                className={clsx(
                  'relative flex h-10 shrink-0 items-center justify-between gap-3 rounded-sm border px-3.5 font-mono text-label-md transition-colors',
                  w === week ? 'border-primary bg-raised text-ink' : 'border-transparent text-muted hover:bg-card hover:text-ink',
                )}
              >
                <span className="flex items-center gap-2">
                  {weekBlock(draft.mesocycles, w) ? (
                    <span aria-hidden="true" className={clsx('size-2 rounded-full', blockTone(weekBlock(draft.mesocycles, w)!.mesoIndex).split(' ')[0])} />
                  ) : null}
                  W{w}
                </span>
                <span className={clsx('text-micro', w === week ? 'text-primary' : 'text-muted')}>{daysOfWeek(draft, w).length} d</span>
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-title-md text-ink">
              Week {week}
              {block ? (
                <span className="ml-2.5 font-sans text-label-md font-normal text-primary">
                  {block.mesoName}
                  {block.microLabel ? ` · ${block.microLabel}` : ''}
                  {block.isDeload ? ' · DELOAD' : ''}
                  {block.rpe ? ` · RPE ${block.rpe}` : ''}
                </span>
              ) : null}
            </h2>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={draft.durationWeeks < 2 || weekDays.length === 0}
                onClick={() => update(copyWeekToAll(draft, week))}
              >
                Copy week {week} to all weeks
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={freeDayNumbers(draft, week).length === 0}
                onClick={() => {
                  const r = addDay(draft, week);
                  update(r.draft);
                  setActiveDay(r.dayKey);
                }}
              >
                <Icon icon={Plus} />
                Add day
              </Button>
            </div>
          </div>

          {weekDays.length === 0 ? (
            <Card className="p-4 text-ui text-muted">Week {week} has no training days yet. Add a day to start.</Card>
          ) : (
            weekDays.map((day) => (
              <DayCard
                key={day.key}
                day={day}
                active={day.key === activeDay}
                dayOptions={[day.dayNumber, ...freeDayNumbers(draft, week)].sort((a, b) => a - b)}
                errors={errors}
                canDuplicate={freeDayNumbers(draft, week).length > 0}
                onSelect={() => setActiveDay(day.key)}
                onPatch={(patch) => update(patchDay(draft, day.key, patch))}
                onDuplicate={() => {
                  const r = duplicateDay(draft, day.key);
                  update(r.draft);
                  setActiveDay(r.dayKey);
                }}
                onRemove={() => {
                  update(removeDay(draft, day.key));
                  if (activeDay === day.key) setActiveDay(null);
                }}
                onAddExercise={() => {
                  setActiveDay(day.key);
                  setPickerOpen(true);
                }}
                onPatchRx={(rxKey, patch) => update(patchExercise(draft, day.key, rxKey, patch))}
                onMoveRx={(rxKey, delta) => update(moveExercise(draft, day.key, rxKey, delta))}
                onRemoveRx={(rxKey) => update(removeExercise(draft, day.key, rxKey))}
              />
            ))
          )}
        </div>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        library={library}
        targetLabel={active ? `Week ${active.weekNumber} · ${active.name || `Day ${active.dayNumber}`}` : null}
        addedNames={addedNames}
        onPick={(ex) => active && update(addExercise(draft, active.key, ex))}
      />

      <Sheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this program?"
        description="No client uses it. This cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove} disabled={pending}>
              {pending ? 'Deleting…' : 'Delete program'}
            </Button>
          </>
        }
      >
        <p className="text-ui text-muted">The program and its prescriptions are removed.</p>
      </Sheet>
    </div>
  );
}
