'use client';

import clsx from 'clsx';
import { AlertTriangle, Check, CloudCheck, PlayCircle, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { PLATES_KG, PLATES_LB, TEMPO_PATTERN, WORKOUT_LOG_LIMITS, WeightUnit, plateLoader } from '@coaching/shared';
import type {
  ExerciseAlternativeDto,
  ExerciseDto,
  NextTarget,
  SwapReason,
  TemplateFolderDto,
  VideoableSetDto,
  WorkoutLogDto,
  WorkoutTemplateDto,
} from '@coaching/shared';
import { submitWorkoutLog } from '@/actions/workout-logs';
import { DEFAULT_BAR, describePlates } from '@/components/calculators/calculators-model';
import { LimitationBadge } from '@/components/limitations/LimitationBadge';
import { EFFORT_MODE_STORAGE_KEY } from '@/components/profile/AthletePreferences';
import { ExercisePicker } from '@/components/programs/ExercisePicker';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { SetEditorSheet } from '@/components/workout-logs/SetEditorSheet';
import { toNumber } from '@/lib/format';
import { kgToDisplay, unitLabel } from '@/lib/units';
import { CoachCues } from './CoachCues';
import { ExerciseNotes, type SavedNote } from './ExerciseNotes';
import { LoggedSets } from './LoggedSets';
import { RestPill, RestTimerCard, useRestTimer } from './RestTimer';
import { RpeGuide } from './RpeGuide';
import { SessionComplete } from './SessionComplete';
import { Stepper } from './Stepper';
import { SwapExerciseButton } from './SwapExerciseButton';
import { SaveTemplateSheet, TemplatePickerSheet } from './TemplateSheets';
import {
  LOGGER_RIR,
  LOGGER_RPE,
  RPE_ERROR,
  appendExercise,
  appendTemplate,
  commitSet,
  countSets,
  draftToTemplateExercises,
  dropEmptyExercises,
  editSetValues,
  eyebrow,
  formatStepValue,
  formatTargetLine,
  freeformPlan,
  nextSetDefaults,
  removeSet,
  restTaken,
  rirFromRpe,
  rpeError,
  rpeFromRir,
  setExerciseNote,
  startFreeform,
  startFromLastLog,
  startFromTemplate,
  startFromToday,
  stepValue,
  swapExercise,
  toLocalInput,
  undoSwap,
  validateDraft,
  weightStepFor,
  type Baseline,
  type EffortMode,
  type FlowStart,
  type StepValues,
  type TodayWorkoutInput,
} from './logger-model';

interface Props {
  /** `today`: prescription from Today. `repeat`: copy of `lastLog`. `template`: a saved template. `freeform`: pick exercises yourself. */
  mode: 'today' | 'repeat' | 'template' | 'freeform';
  today: TodayWorkoutInput | null;
  workoutName: string | null;
  lastLog: WorkoutLogDto | null;
  /** Global, coach and the athlete's own exercises: the one list behind the picker. */
  catalog: ExerciseDto[];
  templates: WorkoutTemplateDto[];
  folders: TemplateFolderDto[];
  /** Set when the session was started from a template (`mode: 'template'`). */
  template: WorkoutTemplateDto | null;
  unit: WeightUnit;
  /** Onboarding starting weights by exercise id (kg). */
  baselines: Record<string, Baseline>;
  /** Persistent notes by exercise id (`ExerciseNote`), shown while logging that lift. */
  savedNotes: Record<string, SavedNote[]>;
}

interface Done {
  targets: NextTarget[];
  sets: number;
  clipSets: VideoableSetDto[];
}

export function WorkoutLogger({ mode, today, workoutName, lastLog, catalog, templates, folders, template, unit, baselines, savedNotes }: Props) {
  const library = useMemo(
    () => catalog.map((e) => ({ id: e.id, name: e.name, loadIncrementKg: toNumber(e.loadIncrementKg) })),
    [catalog],
  );
  const increments = useMemo(() => Object.fromEntries(library.map((e) => [e.id, e.loadIncrementKg])), [library]);
  const byId = useMemo(() => new Map(library.map((e) => [e.id, e])), [library]);

  const [flow, setFlow] = useState<FlowStart>(() => {
    const at = toLocalInput(new Date());
    if (mode === 'today' && today) return startFromToday(today, increments, at, unit);
    if (mode === 'repeat' && lastLog) return startFromLastLog(lastLog, increments, at, unit);
    if (mode === 'template' && template) return startFromTemplate(template, increments, at, unit);
    return startFreeform(at, unit);
  });
  const { draft, plans } = flow;
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<StepValues>(() => {
    const first = flow.draft.exercises[0];
    return nextSetDefaults(first ? flow.plans[first.key] : undefined, [], unit, first ? baselines[first.exerciseId] : undefined);
  });
  const [tempo, setTempo] = useState('');
  const [effort, setEffort] = useState<EffortMode>('RPE');
  const [pickingExercise, setPickingExercise] = useState(false);
  const [pickingTemplate, setPickingTemplate] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [error, setError] = useState<string>();
  const [announce, setAnnounce] = useState('');
  const [done, setDone] = useState<Done | null>(null);
  const [pending, startTransition] = useTransition();
  const rest = useRestTimer();

  useEffect(() => {
    const saved = window.localStorage.getItem(EFFORT_MODE_STORAGE_KEY);
    if (saved === 'RPE' || saved === 'RIR') setEffort(saved);
  }, []);

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

  if (done) return <SessionComplete targets={done.targets} unit={unit} setsLogged={done.sets} clipSets={done.clipSets} />;
  if (!exercise) return null;

  const demoUrl = catalog.find((e) => e.id === exercise.exerciseId)?.demoUrl ?? null;
  const key = exercise.key;
  const hasExercise = exercise.exerciseId !== '';
  const name = plan?.name || (hasExercise ? (byId.get(exercise.exerciseId)?.name ?? '') : '') || 'Choose an exercise';
  const weightStep = plan?.weightStep ?? 2.5;
  const maxWeight = kgToDisplay(WORKOUT_LOG_LIMITS.maxWeightKg, unit);
  const planned = plan?.plannedSets ?? 0;
  const extra = planned > 0 && logged.length >= planned;
  const editingSet = editing ? logged.find((s) => s.key === editing) : undefined;
  const targetLine = plan?.target ? formatTargetLine(plan.target, unit) : '';
  const plates = plateLoader(values.weight, DEFAULT_BAR[unit], unit === WeightUnit.LB ? PLATES_LB : PLATES_KG);

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

  function addPicked(picked: ExerciseDto): void {
    setPickingExercise(false);
    const next = appendExercise(flow, { id: picked.id, name: picked.name, loadIncrementKg: toNumber(picked.loadIncrementKg) }, unit);
    setFlow(next);
    goTo(next.draft.exercises.length - 1, next);
  }

  function addTemplate(picked: WorkoutTemplateDto): void {
    setPickingTemplate(false);
    const known = new Set(draft.exercises.map((e) => e.key));
    const next = appendTemplate(flow, picked, increments, unit);
    setFlow(next);
    goTo(Math.max(0, next.draft.exercises.findIndex((e) => !known.has(e.key))), next);
  }

  function logSet(): void {
    if (rpeProblem || tempoProblem) return;
    const restSeconds = restTaken(rest.startedAt, Date.now());
    const extras = {
      ...(effort === 'RIR' ? { rir: rirFromRpe(values.rpe) } : {}),
      ...(restSeconds !== undefined ? { restSeconds } : {}),
    };
    setFlow({ ...flow, draft: commitSet(draft, key, values, tempo.trim().toUpperCase(), extras) });
    setAnnounce(
      `Set ${logged.length + 1} logged: ${formatStepValue('weight', values.weight)} ${unitLabel(unit)} for ${values.reps} reps.`,
    );
    setError(undefined);
    rest.start();
  }

  function nextExercise(): void {
    if (index < lastIndex) return goTo(index + 1);
    setPickingExercise(true);
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
      if (outcome.ok) setDone({ targets: outcome.data.targets, sets: totalSets, clipSets: outcome.data.clipSets });
      else setError(outcome.error);
    });
  }

  return (
    <>
      <PageHeader
        title={workoutName || 'Active Workout'}
        back={{ href: '/client', label: 'Back to today' }}
        meta={`${draft.exercises.filter((e) => e.sets.length > 0).length} / ${draft.exercises.length} exercises · ${totalSets} sets`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald/40 bg-emerald-bg px-3 py-1 font-mono text-label-sm text-emerald sm:inline-flex">
              <span className="size-2 rounded-full bg-emerald" />
              Session guard active
            </span>
            <Button size="sm" onClick={() => finish()} disabled={pending} aria-busy={pending}>
              {pending ? 'Saving…' : 'Finish Workout'}
            </Button>
          </div>
        }
      />

      {/* Two-Column Web Workspace (`athlete_web_active_workout_logger`) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left Main Column (8 cols): Exercise Tabs + Active Card + Logged Sets + Notes */}
        <div className="flex flex-col gap-5 lg:col-span-8">
          {draft.exercises.length > 1 ? (
            <nav aria-label="Exercises in this session">
              <ol className="flex gap-2 overflow-x-auto pb-1">
                {draft.exercises.map((e, i) => {
                  const label = plans[e.key]?.name || byId.get(e.exerciseId)?.name || 'New exercise';
                  const active = i === index;
                  return (
                    <li key={e.key} className="shrink-0">
                      <button
                        type="button"
                        aria-current={active ? 'step' : undefined}
                        onClick={() => goTo(i)}
                        className={clsx(
                          'inline-flex h-9 max-w-52 items-center gap-1.5 truncate rounded-full border px-3.5 font-sans text-label-md transition-colors',
                          active
                            ? 'border-primary bg-primary-container text-primary'
                            : 'border-line bg-card text-muted hover:border-line-strong hover:text-ink',
                        )}
                      >
                        {e.sets.length > 0 ? <Icon icon={Check} size={14} className="text-emerald" /> : null}
                        <span className="truncate">{label}</span>
                        <span className="sr-only">{e.sets.length > 0 ? `, ${e.sets.length} sets logged` : ', not started'}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          ) : null}

          <article className="flex flex-col gap-5 rounded-md border border-line bg-card p-6">
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
              <div className="min-w-0">
                <p className="font-mono text-label-sm uppercase text-muted">
                  {hasExercise ? eyebrow(plan, logged.length, unit) : `EXERCISE ${index + 1}`}
                </p>
                <h2 className="mt-1 break-words font-display text-title-lg text-ink">{name}</h2>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {targetLine ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/40 bg-emerald-bg px-3 py-1 font-mono text-label-sm text-emerald">
                    <Icon icon={Sparkles} size={14} />
                    Engine Target: {targetLine}
                  </span>
                ) : null}
                {demoUrl ? (
                  <a
                    href={demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 font-mono text-label-sm text-primary hover:border-primary"
                  >
                    <Icon icon={PlayCircle} size={14} />
                    Demo video<span className="sr-only"> for {name} (opens in a new tab)</span>
                  </a>
                ) : null}
                <div className="lg:hidden">
                  <RestPill startedAt={rest.startedAt} now={rest.now} restSeconds={plan?.restSeconds ?? null} />
                </div>
              </div>
            </header>

            {/* Inline Amber Injury / Limitation Caution Banner with Safe Swap Button */}
            {plan?.limitation ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-amber/40 bg-amber-bg p-4">
                <div className="flex items-start gap-3">
                  <Icon icon={AlertTriangle} size={20} className="mt-0.5 shrink-0 text-amber" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-sans text-label-md font-semibold text-amber">Injury / Limitation Flag</p>
                      <LimitationBadge flag={plan.limitation} />
                    </div>
                    <p className="mt-0.5 text-label-md text-ink">
                      {plan.limitation.note ? `${plan.limitation.note} · ` : ''}You can still log it, or swap to a safer movement.
                    </p>
                  </div>
                </div>
                {logged.length === 0 && hasExercise ? (
                  <SwapExerciseButton current={{ id: exercise.exerciseId, name }} unit={unit} onSwap={swap} caution />
                ) : null}
              </div>
            ) : null}

            {plan?.carryForward && plan.carryForward.length > 0 ? (
              <CoachCues cues={plan.carryForward} coachName={null} label={`Coach notes for ${name}`} />
            ) : null}

            {!hasExercise ? (
              <Button size="lg" className="w-full" onClick={() => setPickingExercise(true)}>
                Choose an exercise
              </Button>
            ) : (
              <>
                {(!plan?.limitation && logged.length === 0) || exercise.swap ? (
                  <div className="flex flex-wrap items-center gap-3">
                    {!plan?.limitation && logged.length === 0 ? (
                      <SwapExerciseButton current={{ id: exercise.exerciseId, name }} unit={unit} onSwap={swap} />
                    ) : null}
                    {exercise.swap ? (
                      <p className="flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-sm border border-sky/40 bg-sky-bg px-3.5 py-2 text-meta text-ink">
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

                <section aria-label="Log a set" className="space-y-4 rounded-sm border border-line bg-canvas-low p-4">
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
                    <div role="group" aria-label="Effort scale" className="mb-3 inline-flex gap-1 rounded-full border border-line bg-card p-1">
                      {(['RPE', 'RIR'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          aria-pressed={effort === m}
                          onClick={() => {
                            setEffort(m);
                            if (m === 'RIR') setValues((v) => ({ ...v, rpe: rpeFromRir(rirFromRpe(v.rpe)) }));
                          }}
                          className={clsx(
                            'inline-flex rounded-full px-3.5 py-1 font-mono text-label-sm uppercase transition-colors',
                            effort === m ? 'bg-primary text-primary-ink' : 'text-muted hover:text-ink',
                          )}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    {effort === 'RPE' ? (
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
                    ) : (
                      <Stepper
                        label={`RIR (${LOGGER_RIR.min}–${LOGGER_RIR.max})`}
                        noun="RIR"
                        display={String(rirFromRpe(values.rpe))}
                        stepLabel="1"
                        canDecrease={rirFromRpe(values.rpe) > LOGGER_RIR.min}
                        canIncrease={rirFromRpe(values.rpe) < LOGGER_RIR.max}
                        onStep={(d) => setValues((v) => ({ ...v, rpe: rpeFromRir(stepValue(rirFromRpe(v.rpe), d, LOGGER_RIR.min, LOGGER_RIR.max)) }))}
                      />
                    )}
                    {effort === 'RIR' ? <p className="mt-1 text-meta text-muted">Reps left in the tank. Stored with RPE {formatStepValue('rpe', values.rpe)} for the engine.</p> : null}
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
                    <p id="set-tempo-hint" className={clsx('mt-1 text-meta', tempoProblem ? 'font-medium text-danger' : 'text-muted')}>
                      Lowering, pause, lifting, top pause in seconds. Use X for explosive.
                    </p>
                  </div>
                  {rpeProblem ? (
                    <p role="alert" className="text-meta font-medium text-danger">
                      {RPE_ERROR}
                    </p>
                  ) : null}
                  <Button size="lg" className="w-full" disabled={rpeProblem !== null || tempoProblem} onClick={logSet}>
                    {extra ? 'Log Extra Set' : 'Log Set'}
                  </Button>
                </section>
              </>
            )}

            <p role="status" aria-live="polite" className="sr-only">
              {announce}
            </p>

            <LoggedSets sets={logged} unit={unit} onEdit={setEditing} />

            {hasExercise ? (
              <section aria-label="Exercise notes" className="space-y-3 border-t border-line pt-4">
                <ExerciseNotes exerciseId={exercise.exerciseId} notes={savedNotes[exercise.exerciseId] ?? []} />
                <div>
                  <Label htmlFor="exercise-note">Exercise note</Label>
                  <textarea
                    id="exercise-note"
                    rows={2}
                    maxLength={WORKOUT_LOG_LIMITS.maxNoteLength}
                    value={exercise.notes ?? ''}
                    onChange={(e) => setFlow({ ...flow, draft: setExerciseNote(draft, key, e.target.value) })}
                    placeholder="Bar speed, stance width, belt notch..."
                    className="block w-full rounded-sm border border-line bg-canvas-low px-3.5 py-2 font-sans text-body text-ink placeholder:text-faint focus:border-primary focus:outline-none"
                  />
                </div>
              </section>
            ) : null}
          </article>

          <FormError>{error}</FormError>

          {confirmFinish ? (
            <div
              role="alertdialog"
              aria-label="Finish workout?"
              className="space-y-3 rounded-md border border-amber/40 bg-amber-bg p-4"
            >
              <p className="text-ui text-amber">
                {emptyCount} {emptyCount === 1 ? 'exercise has' : 'exercises have'} no sets logged and will be skipped.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" size="lg" onClick={() => setConfirmFinish(false)} disabled={pending}>
                  Keep Logging
                </Button>
                <Button size="lg" onClick={() => finish(true)} disabled={pending} aria-busy={pending}>
                  {pending ? 'Saving…' : 'Finish Anyway'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                size="lg"
                disabled={index === lastIndex && (logged.length === 0 || !hasExercise)}
                onClick={nextExercise}
              >
                {index < lastIndex ? 'Next Exercise' : 'Add Exercise'}
              </Button>
              <Button size="lg" onClick={() => finish()} disabled={pending} aria-busy={pending}>
                {pending ? 'Saving…' : 'Finish Workout'}
              </Button>
            </div>
          )}
        </div>

        {/* Right Sticky Rail (4 cols): Rest Timer, Session Guard + Templates, Quick Plate Loader */}
        <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:col-span-4">
          <RestTimerCard
            startedAt={rest.startedAt}
            now={rest.now}
            restSeconds={plan?.restSeconds ?? null}
            onStart={rest.start}
            onReset={rest.reset}
            onAdjust={rest.adjust}
          />

          <section className="flex items-start gap-3 rounded-md border border-emerald/40 bg-emerald-bg p-5">
            <Icon icon={CloudCheck} size={20} className="mt-0.5 shrink-0 text-emerald" />
            <div>
              <p className="font-sans text-label-md font-semibold text-emerald">Local Session State Active</p>
              <p className="mt-0.5 text-label-md text-ink">
                Sets stay protected against accidental tab closes until you finish and commit your session.
              </p>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-md border border-line bg-card p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-title-md text-ink">Quick Plate Loader</h2>
              <span className="font-mono text-label-md text-primary">
                {formatStepValue('weight', values.weight)} {unitLabel(unit)}
              </span>
            </div>
            <div className="rounded-sm border border-line bg-canvas-low px-3.5 py-3 font-mono text-label-md text-ink">
              {plates ? describePlates(plates.perSide) : `Below ${DEFAULT_BAR[unit]} ${unitLabel(unit)} bar`}
            </div>
            <p className="font-mono text-label-sm text-muted">
              Per side on {DEFAULT_BAR[unit]} {unitLabel(unit)} barbell
            </p>
          </section>

          <section className="flex flex-col gap-2.5 rounded-md border border-line bg-card p-5">
            <span className="font-mono text-label-sm uppercase text-muted">SESSION TEMPLATES</span>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPickingTemplate(true)}>
                Load Template
              </Button>
              {totalSets > 0 ? (
                <Button variant="secondary" size="sm" onClick={() => setSavingTemplate(true)}>
                  Save as Template
                </Button>
              ) : null}
            </div>
          </section>
        </aside>
      </div>

      <ExercisePicker
        open={pickingExercise}
        onClose={() => setPickingExercise(false)}
        library={catalog}
        targetLabel="this session"
        addedNames={new Set(draft.exercises.map((e) => byId.get(e.exerciseId)?.name ?? ''))}
        onPick={addPicked}
      />
      <TemplatePickerSheet open={pickingTemplate} onClose={() => setPickingTemplate(false)} folders={folders} templates={templates} onPick={addTemplate} />
      <SaveTemplateSheet open={savingTemplate} onClose={() => setSavingTemplate(false)} folders={folders} exercises={draftToTemplateExercises(draft)} />

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
