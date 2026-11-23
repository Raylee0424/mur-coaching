'use client';

import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { MUSCLE_GROUP_LABELS, MuscleGroup, WORKOUT_LOG_LIMITS } from '@coaching/shared';
import type {
  ExerciseAlternativeDto,
  MuscleGroup as MuscleGroupT,
  NextTarget,
  SwapReason,
  WeightUnit,
  WorkoutLogDto,
} from '@coaching/shared';
import { submitWorkoutLog } from '@/actions/workout-logs';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { LimitationBadge } from '@/components/limitations/LimitationBadge';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { SetEditorSheet } from '@/components/workout-logs/SetEditorSheet';
import { TEMPO_PATTERN } from '@coaching/shared';
import { toNumber } from '@/lib/format';
import { kgToDisplay, unitLabel } from '@/lib/units';
import { LoggedSets } from './LoggedSets';
import { RestPill, useRestTimer } from './RestTimer';
import { RpeGuide } from './RpeGuide';
import { SessionComplete } from './SessionComplete';
import { Stepper } from './Stepper';
import { SwapExerciseButton } from './SwapExerciseButton';
import {
  LOGGER_RPE,
  RPE_ERROR,
  commitSet,
  countSets,
  dropEmptyExercises,
  editSetValues,
  eyebrow,
  formatStepValue,
  freeformPlan,
  nextSetDefaults,
  removeSet,
  setExerciseId,
  setExerciseNote,
  startFreeform,
  startFromLastLog,
  startFromToday,
  stepValue,
  swapExercise,
  toLocalInput,
  undoSwap,
  validateDraft,
  weightStepFor,
  addExercise,
  rpeError,
  type Baseline,
  type FlowStart,
  type StepValues,
  type TodayWorkoutInput,
} from './logger-model';

export interface LibraryExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroupT;
  /** kg */
  loadIncrementKg: number;
}

interface Props {
  /** `today`: prescription from Today. `repeat`: copy of `lastLog`. `freeform`: pick exercises yourself. */
  mode: 'today' | 'repeat' | 'freeform';
  today: TodayWorkoutInput | null;
  workoutName: string | null;
  lastLog: WorkoutLogDto | null;
  library: LibraryExercise[];
  unit: WeightUnit;
  /** Onboarding starting weights by exercise id (kg). */
  baselines: Record<string, Baseline>;
  /** Persistent notes by exercise id (`ExerciseNote`), shown while logging that lift. */
  savedNotes: Record<string, string[]>;
}

interface Done {
  targets: NextTarget[];
  sets: number;
}

export function WorkoutLogger({ mode, today, workoutName, lastLog, library, unit, baselines, savedNotes }: Props) {
  const increments = useMemo(() => Object.fromEntries(library.map((e) => [e.id, e.loadIncrementKg])), [library]);
  const byId = useMemo(() => new Map(library.map((e) => [e.id, e])), [library]);

  const [flow, setFlow] = useState<FlowStart>(() => {
    const at = toLocalInput(new Date());
    if (mode === 'today' && today) return startFromToday(today, increments, at, unit);
    if (mode === 'repeat' && lastLog) return startFromLastLog(lastLog, increments, at, unit);
    return startFreeform(at, unit);
  });
  const { draft, plans } = flow;
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<StepValues>(() => {
    const first = flow.draft.exercises[0];
    return nextSetDefaults(first ? flow.plans[first.key] : undefined, [], unit, first ? baselines[first.exerciseId] : undefined);
  });
  const [tempo, setTempo] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [error, setError] = useState<string>();
  const [announce, setAnnounce] = useState('');
  const [done, setDone] = useState<Done | null>(null);
  const [pending, startTransition] = useTransition();
  const rest = useRestTimer();

  const exercise = draft.exercises[index];
  const plan = exercise ? plans[exercise.key] : undefined;
  const logged = exercise?.sets ?? [];
  const totalSets = countSets(draft);
  const emptyCount = draft.exercises.filter((e) => e.sets.length === 0).length;
  const lastIndex = draft.exercises.length - 1;
  const rpeProblem = rpeError(values.rpe);
  const tempoProblem = tempo.trim() !== '' && !TEMPO_PATTERN.test(tempo.trim().toUpperCase());

  // Leaving mid-session would silently drop the sets.
  useEffect(() => {
    if (done || totalSets === 0) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [done, totalSets]);

  if (done) return <SessionComplete targets={done.targets} unit={unit} setsLogged={done.sets} />;
  if (!exercise) return null;

  const key = exercise.key;
  const hasExercise = exercise.exerciseId !== '';
  const name = plan?.name || (hasExercise ? (byId.get(exercise.exerciseId)?.name ?? '') : '') || 'Choose an exercise';
  const weightStep = plan?.weightStep ?? 2.5;
  const maxWeight = kgToDisplay(WORKOUT_LOG_LIMITS.maxWeightKg, unit);
  const planned = plan?.plannedSets ?? 0;
  const extra = planned > 0 && logged.length >= planned;
  const editingSet = editing ? logged.find((s) => s.key === editing) : undefined;

  function goTo(i: number, next: FlowStart = flow): void {
    const target = next.draft.exercises[i];
    if (!target) return;
    setIndex(i);
    setValues(nextSetDefaults(next.plans[target.key], target.sets, unit, baselines[target.exerciseId]));
    setTempo(next.draft.exercises[i]?.sets.at(-1)?.tempo ?? '');
    rest.reset();
    setConfirmFinish(false);
    setError(undefined);
  }

  function chooseExercise(id: string): void {
    const source = byId.get(id);
    if (!source) return;
    const next: FlowStart = {
      draft: setExerciseId(draft, key, id),
      plans: {
        ...plans,
        [key]: freeformPlan({ id, name: source.name, loadIncrementKg: source.loadIncrementKg }, unit),
      },
    };
    setFlow(next);
    setValues(nextSetDefaults(next.plans[key], [], unit, baselines[id]));
  }

  function logSet(): void {
    if (rpeProblem || tempoProblem) return;
    setFlow({ ...flow, draft: commitSet(draft, key, values, tempo.trim().toUpperCase()) });
    setAnnounce(
      `Set ${logged.length + 1} logged: ${formatStepValue('weight', values.weight)} ${unitLabel(unit)} for ${values.reps} reps.`,
    );
    setError(undefined);
    rest.start();
  }

  function nextExercise(): void {
    if (index < lastIndex) return goTo(index + 1);
    const next: FlowStart = { ...flow, draft: addExercise(draft) };
    setFlow(next);
    goTo(index + 1, next);
  }

  function swap(alt: ExerciseAlternativeDto, reason: SwapReason, note: string): void {
    const s = alt.suggested;
    const incrementKg = increments[alt.id] ?? 2.5;
    const swapped = {
      ...(plan ?? freeformPlan({ id: alt.id, name: alt.name, loadIncrementKg: incrementKg }, unit)),
      name: alt.name,
      target: s
        ? {
            weightKg: toNumber(s.weightKg),
            repsMin: s.reps,
            repsMax: s.reps,
            rpe: s.rpe === null ? null : toNumber(s.rpe),
          }
        : null,
      previous: [],
      weightStep: weightStepFor(incrementKg, unit),
      limitation: alt.limitation ?? null,
      original: plan?.original ?? plan,
    };
    const next: FlowStart = {
      draft: swapExercise(draft, key, alt.id, reason, note),
      plans: { ...plans, [key]: swapped },
    };
    setFlow(next);
    setValues(nextSetDefaults(swapped, [], unit, baselines[alt.id]));
  }

  function undo(): void {
    const original = plan?.original;
    const next: FlowStart = {
      draft: undoSwap(draft, key),
      plans: { ...plans },
    };
    if (original) next.plans[key] = original;
    setFlow(next);
    setValues(nextSetDefaults(original, [], unit, baselines[exercise?.swap?.fromExerciseId ?? '']));
  }

  function finish(skipConfirm = false): void {
    if (totalSets === 0) {
      setError('Log at least one set before finishing.');
      return;
    }
    const skipped = draft.exercises.filter((e) => e.sets.length === 0).length;
    if (skipped > 0 && !skipConfirm) {
      setConfirmFinish(true);
      return;
    }
    const result = validateDraft(dropEmptyExercises(draft), new Date());
    if (!result.ok) {
      setError(Object.values(result.errors)[0] ?? 'Check your sets and try again.');
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const outcome = await submitWorkoutLog(result.request);
      if (outcome.ok) setDone({ targets: outcome.data.targets, sets: totalSets });
      else setError(outcome.error);
    });
  }

  const header = (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-mono text-micro uppercase text-faint">{hasExercise ? eyebrow(plan, logged.length, unit) : `EXERCISE ${index + 1}`}</p>
        <h2 className="mt-1 break-words font-display text-title font-semibold">{name}</h2>
        {plan?.limitation ? (
          <p className="mt-1 flex flex-wrap items-center gap-2 text-meta text-muted">
            <LimitationBadge flag={plan.limitation} />
            {plan.limitation.note ? <span>{plan.limitation.note}</span> : null}
            <span className="text-faint">You can still log it. Swap if it hurts.</span>
          </p>
        ) : null}
      </div>
      <RestPill startedAt={rest.startedAt} now={rest.now} restSeconds={plan?.restSeconds ?? null} />
    </header>
  );

  return (
    <>
      <PageHeader
        title={workoutName || 'Log session'}
        back={{ href: '/client', label: 'Back to today' }}
        meta={`${draft.exercises.filter((e) => e.sets.length > 0).length} / ${draft.exercises.length} exercises`}
      />
      <div className="max-w-xl space-y-5">
        {header}

        {draft.exercises.length > 1 ? (
          <nav aria-label="Exercises in this session">
            <ol className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
              {draft.exercises.map((e, i) => {
                const label = plans[e.key]?.name || byId.get(e.exerciseId)?.name || 'New exercise';
                return (
                  <li key={e.key} className="shrink-0">
                    <button
                      type="button"
                      aria-current={i === index ? 'step' : undefined}
                      onClick={() => goTo(i)}
                      className={clsx(
                        'inline-flex h-9 max-w-44 items-center gap-1.5 truncate rounded-sm px-3 text-ui',
                        i === index ? 'bg-raised text-ink shadow-[inset_0_-2px_0_theme(colors.signal.DEFAULT)]' : 'text-muted hover:bg-raised/60 hover:text-ink',
                      )}
                    >
                      {e.sets.length > 0 ? <Icon icon={Check} size={14} /> : null}
                      {label}
                      <span className="sr-only">{e.sets.length > 0 ? `, ${e.sets.length} sets logged` : ', not started'}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}

        {!hasExercise ? (
          <section className="space-y-3">
            <div>
              <Label htmlFor="pick-exercise">Exercise</Label>
              <Select id="pick-exercise" value="" onChange={(e) => chooseExercise(e.target.value)}>
                <option value="" disabled>
                  Choose an exercise…
                </option>
                {Object.values(MuscleGroup).map((group) => {
                  const items = library.filter((e) => e.muscleGroup === group);
                  return items.length === 0 ? null : (
                    <optgroup key={group} label={MUSCLE_GROUP_LABELS[group]}>
                      {items.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </Select>
            </div>
          </section>
        ) : (
          <>
            {logged.length === 0 || exercise.swap ? (
              <div className="flex flex-wrap items-center gap-3">
                {logged.length === 0 ? (
                  <SwapExerciseButton current={{ id: exercise.exerciseId, name }} unit={unit} onSwap={swap} />
                ) : null}
                {exercise.swap ? (
                  <p className="flex min-w-0 flex-1 flex-wrap items-center gap-2 border-l-2 border-l-sky bg-card px-3 py-2 text-meta">
                    <span>Swapped from {byId.get(exercise.swap.fromExerciseId)?.name ?? 'the prescribed lift'}</span>
                    {logged.length === 0 ? (
                      <Button variant="ghost" size="sm" className="ml-auto" onClick={undo}>
                        Undo
                      </Button>
                    ) : null}
                  </p>
                ) : null}
              </div>
            ) : null}

            <section aria-label="Log a set" className="space-y-4">
              <Stepper
                label="Weight"
                noun="weight"
                display={formatStepValue('weight', values.weight)}
                unit={unitLabel(unit)}
                stepLabel={formatStepValue('weight', weightStep)}
                canDecrease={values.weight > 0}
                canIncrease={values.weight < maxWeight}
                onStep={(d) =>
                  setValues((v) => ({
                    ...v,
                    weight: stepValue(v.weight, d * weightStep, 0, maxWeight),
                  }))
                }
              />
              <div className="border-t border-line pt-4">
                <Stepper
                  label="Reps"
                  noun="reps"
                  display={formatStepValue('reps', values.reps)}
                  stepLabel="1"
                  canDecrease={values.reps > 1}
                  canIncrease={values.reps < WORKOUT_LOG_LIMITS.maxReps}
                  onStep={(d) =>
                    setValues((v) => ({
                      ...v,
                      reps: stepValue(v.reps, d, 1, WORKOUT_LOG_LIMITS.maxReps),
                    }))
                  }
                />
              </div>
              <div className="border-t border-line pt-4">
                <Stepper
                  label={`RPE (${LOGGER_RPE.min.toFixed(1)}–${LOGGER_RPE.max.toFixed(1)})`}
                  noun="RPE"
                  display={formatStepValue('rpe', values.rpe)}
                  stepLabel="0.5"
                  canDecrease={values.rpe > WORKOUT_LOG_LIMITS.rpeMin}
                  canIncrease={values.rpe < WORKOUT_LOG_LIMITS.rpeMax}
                  onStep={(d) =>
                    setValues((v) => ({
                      ...v,
                      rpe: stepValue(v.rpe, d * LOGGER_RPE.step, WORKOUT_LOG_LIMITS.rpeMin, WORKOUT_LOG_LIMITS.rpeMax),
                    }))
                  }
                  action={
                    <RpeGuide
                      target={plan?.target?.rpe ?? null}
                      current={values.rpe}
                      onSelect={(rpe) => setValues((v) => ({ ...v, rpe }))}
                    />
                  }
                />
              </div>
              <div className="border-t border-line pt-4">
                <Label htmlFor="set-tempo">Tempo (optional)</Label>
                <Input
                  id="set-tempo"
                  value={tempo}
                  maxLength={7}
                  placeholder="3-1-1-0"
                  autoCapitalize="characters"
                  aria-invalid={tempoProblem}
                  aria-describedby="set-tempo-hint"
                  onChange={(e) => setTempo(e.target.value)}
                />
                <p id="set-tempo-hint" className={clsx('mt-1 text-meta', tempoProblem ? 'font-medium text-danger' : 'text-faint')}>
                  Lowering, pause, lifting, top pause in seconds. Use X for explosive.
                </p>
              </div>
              {rpeProblem ? (
                <p role="alert" className="text-meta font-medium text-danger">
                  {RPE_ERROR}
                </p>
              ) : null}
              <Button size="lg" className="w-full" disabled={rpeProblem !== null || tempoProblem} onClick={logSet}>
                {extra ? 'Log extra set' : 'Log set'}
              </Button>
            </section>
          </>
        )}

        <p role="status" aria-live="polite" className="sr-only">
          {announce}
        </p>

        <LoggedSets sets={logged} unit={unit} onEdit={setEditing} />

        {hasExercise ? (
          <section aria-label="Exercise notes" className="space-y-3">
            {(savedNotes[exercise.exerciseId] ?? []).length > 0 ? (
              <div className="border-l-2 border-l-sky bg-card px-3 py-2">
                <p className="font-mono text-micro uppercase text-muted">Your saved notes</p>
                <ul className="mt-1 space-y-1 text-ui">
                  {(savedNotes[exercise.exerciseId] ?? []).map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div>
              <Label htmlFor="exercise-note">Note for this session</Label>
              <textarea
                id="exercise-note"
                rows={2}
                maxLength={WORKOUT_LOG_LIMITS.maxNoteLength}
                value={exercise.notes ?? ''}
                onChange={(e) => setFlow({ ...flow, draft: setExerciseNote(draft, key, e.target.value) })}
                placeholder="How it felt, what to fix next time."
                className="block w-full rounded border border-line-strong bg-canvas-low px-3 py-2 font-sans text-body text-ink placeholder:text-faint hover:border-faint"
              />
            </div>
          </section>
        ) : null}

        <FormError>{error}</FormError>

        {confirmFinish ? (
          <div
            role="alertdialog"
            aria-label="Finish workout?"
            className="space-y-3 border-l-2 border-l-amber bg-amber-bg px-3 py-3"
          >
            <p className="text-ui text-amber">
              {emptyCount} {emptyCount === 1 ? 'exercise has' : 'exercises have'} no sets logged and will be skipped.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" size="lg" onClick={() => setConfirmFinish(false)} disabled={pending}>
                Keep logging
              </Button>
              <Button size="lg" onClick={() => finish(true)} disabled={pending} aria-busy={pending}>
                {pending ? 'Saving…' : 'Finish anyway'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              variant="secondary"
              size="lg"
              disabled={index === lastIndex && (logged.length === 0 || !hasExercise)}
              onClick={nextExercise}
            >
              {index < lastIndex ? 'Next exercise' : 'Add exercise'}
            </Button>
            <Button size="lg" onClick={() => finish()} disabled={pending} aria-busy={pending}>
              {pending ? 'Saving…' : 'Finish workout'}
            </Button>
          </div>
        )}
      </div>

      {/* Outside the spaced column: `space-y-*` would push the dialog's margin off the bottom edge. */}
      {editingSet && editing ? (
        <SetEditorSheet
          title={`Set ${logged.indexOf(editingSet) + 1} · ${name}`}
          description="Edit logged set"
          unit={unit}
          initial={{
            weight: Number(editingSet.weight),
            reps: Number(editingSet.reps),
            rpe: editingSet.rpe === '' ? 8 : Number(editingSet.rpe),
            isWarmup: false,
          }}
          weightStep={weightStep}
          rpeMin={LOGGER_RPE.min}
          repsMin={1}
          onClose={() => setEditing(null)}
          onSave={(v) => {
            setFlow({
              ...flow,
              draft: editSetValues(draft, key, editingSet.key, {
                weight: v.weight,
                reps: v.reps,
                rpe: v.rpe ?? 8,
              }),
            });
            setEditing(null);
          }}
          onDelete={() => {
            setFlow({ ...flow, draft: removeSet(draft, key, editingSet.key) });
            setEditing(null);
          }}
        />
      ) : null}
    </>
  );
}
