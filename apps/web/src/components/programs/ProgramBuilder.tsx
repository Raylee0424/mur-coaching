'use client';

import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { PROGRAM_LIMITS } from '@coaching/shared';
import type { ExerciseDto, ProgramDto } from '@coaching/shared';
import { deleteProgram, saveProgram } from '@/actions/programs';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FieldError, FormError, Input, Label } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
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

interface Props {
  program: ProgramDto | null;
  library: ExerciseDto[];
  clients: AssignableClient[];
}

export function ProgramBuilder({ program, library, clients }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState<ProgramDto | null>(program);
  const [draft, setDraft] = useState<ProgramDraft>(() => (program ? fromProgram(program) : emptyProgram()));
  const [baseline, setBaseline] = useState(() => fingerprint(program ? fromProgram(program) : emptyProgram()));
  const [week, setWeek] = useState(1);
  const [activeDay, setActiveDay] = useState<string | null>(() => (program ? daysOfWeek(fromProgram(program), 1)[0]?.key ?? null : null));
  const [errors, setErrors] = useState<BuilderErrors>({});
  const [formError, setFormError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = fingerprint(draft) !== baseline;
  const weekDays = daysOfWeek(draft, week);
  const active = draft.days.find((d) => d.key === activeDay) ?? null;
  const weeks = useMemo(() => Array.from({ length: draft.durationWeeks }, (_, i) => i + 1), [draft.durationWeeks]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const update = (next: ProgramDraft) => {
    setDraft(next);
    setNotice(undefined);
  };

  function selectWeek(w: number): void {
    setWeek(w);
    setActiveDay(daysOfWeek(draft, w)[0]?.key ?? null);
  }

  function save(): void {
    const r = toInput(draft);
    if (!r.ok) {
      setErrors(r.errors);
      setFormError('Fix the highlighted fields.');
      return;
    }
    setErrors({});
    setFormError(undefined);
    startTransition(async () => {
      const result = await saveProgram(saved?.id ?? null, r.input);
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
      setNotice('Saved.');
      if (!saved) router.replace(`/coach/programs/${result.data.id}`);
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

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[1fr_8rem]">
          <div>
            <Label htmlFor="program-name">Program name</Label>
            <Input
              id="program-name"
              value={draft.name}
              maxLength={100}
              placeholder="e.g. 4-Day Powerbuilding"
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
        </div>
        <div>
          <Label htmlFor="program-desc">Description (optional)</Label>
          <textarea
            id="program-desc"
            rows={2}
            maxLength={1000}
            value={draft.description}
            onChange={(e) => update({ ...draft, description: e.target.value })}
            className="block w-full rounded-md border border-line bg-canvas-low px-3 py-2 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={save} disabled={pending || (!dirty && saved !== null)}>
            {pending ? 'Saving…' : saved ? 'Save template' : 'Save as template'}
          </Button>
          {saved ? (
            <AssignProgramButton
              programId={saved.id}
              programName={saved.name}
              clients={clients}
              disabledReason={assignBlocked}
            />
          ) : null}
          {saved && saved.activeClientIds.length === 0 ? (
            <Button variant="secondary" onClick={() => setConfirmDelete(true)} disabled={pending}>
              Delete
            </Button>
          ) : null}
          <span role="status" className="text-sm text-muted">
            {notice ?? (dirty ? 'Unsaved changes' : saved ? `${saved.activeClientIds.length} active clients` : '')}
          </span>
        </div>
        <FormError>{formError}</FormError>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Weeks" className="flex max-w-full gap-1 overflow-x-auto pb-1">
              {weeks.map((w) => (
                <button
                  key={w}
                  role="tab"
                  type="button"
                  aria-selected={w === week}
                  onClick={() => selectWeek(w)}
                  className={clsx(
                    'min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
                    w === week ? 'bg-primary text-primary-ink' : 'text-muted ring-1 ring-inset ring-line-strong hover:text-ink',
                  )}
                >
                  Week {w}
                  <span className="ml-1 text-xs opacity-70">({daysOfWeek(draft, w).length})</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="min-h-11 py-1"
                disabled={draft.durationWeeks < 2 || weekDays.length === 0}
                onClick={() => update(copyWeekToAll(draft, week))}
              >
                Copy week {week} to all weeks
              </Button>
              <Button
                className="min-h-11 py-1"
                disabled={freeDayNumbers(draft, week).length === 0}
                onClick={() => {
                  const r = addDay(draft, week);
                  update(r.draft);
                  setActiveDay(r.dayKey);
                }}
              >
                + Add day
              </Button>
            </div>
          </div>

          {weekDays.length === 0 ? (
            <Card className="text-center text-sm text-muted">Week {week} has no training days yet. Add a day to start.</Card>
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
                onPatchRx={(rxKey, patch) => update(patchExercise(draft, day.key, rxKey, patch))}
                onMoveRx={(rxKey, delta) => update(moveExercise(draft, day.key, rxKey, delta))}
                onRemoveRx={(rxKey) => update(removeExercise(draft, day.key, rxKey))}
              />
            ))
          )}
        </div>
        <ExercisePicker
          library={library}
          targetLabel={active ? `Week ${active.weekNumber} · ${active.name || `Day ${active.dayNumber}`}` : null}
          onPick={(ex) => active && update(addExercise(draft, active.key, ex))}
        />
      </div>

      <Sheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this program?"
        description="No client uses it. This cannot be undone."
      >
        <footer className="flex justify-between gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={remove} disabled={pending}>
            {pending ? 'Deleting…' : 'Delete program'}
          </Button>
        </footer>
      </Sheet>
    </div>
  );
}
