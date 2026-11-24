'use client';

import clsx from 'clsx';
import { Lock } from 'lucide-react';
import { useState, useTransition } from 'react';
import {
  CYCLE_LIMITS,
  CYCLE_PHASE_META,
  CYCLE_SYMPTOMS,
  CYCLE_SYMPTOM_LABELS,
  READINESS_BAND_LABELS,
  READINESS_LIMITS,
  readinessBand,
  readinessScore,
} from '@coaching/shared';
import type { CycleContextDto, CycleSymptom, ReadinessDto, ReadinessInput } from '@coaching/shared';
import { saveCycleEntry, saveReadiness, setCycleSharing } from '@/actions/readiness';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

type Scale = 'sleepQuality' | 'soreness' | 'stress' | 'motivation';

const SCALES: { key: Scale; label: string; hint: string }[] = [
  { key: 'sleepQuality', label: 'Sleep Quality', hint: '5 = Restorative' },
  { key: 'soreness', label: 'Muscle Soreness', hint: '1 = Fresh' },
  { key: 'stress', label: 'Mental Stress', hint: '1 = Low' },
  { key: 'motivation', label: 'Motivation', hint: '5 = Eager' },
];

const BAND_CLASS = { READY: 'border-emerald/40 bg-emerald-bg text-emerald', MODERATE: 'border-amber/40 bg-amber-bg text-amber', LOW: 'border-rose/40 bg-rose-bg text-rose' };

/** Pre-workout readiness (saved per day) + privacy-locked cycle context (encrypted server-side, owner-only). */
export function ReadinessCyclePanel({ today, readiness, cycle }: { today: string; readiness: ReadinessDto | null; cycle: CycleContextDto | null }) {
  return (
    <section className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
      <ReadinessSurvey today={today} saved={readiness} />
      <CycleContext today={today} cycle={cycle} />
    </section>
  );
}

function ReadinessSurvey({ today, saved }: { today: string; saved: ReadinessDto | null }) {
  const toast = useToast();
  const [v, setV] = useState<ReadinessInput>(() => ({
    sleepQuality: saved?.sleepQuality ?? 3,
    soreness: saved?.soreness ?? 2,
    stress: saved?.stress ?? 2,
    motivation: saved?.motivation ?? 3,
    sleepHours: saved?.sleepHours ? Number(saved.sleepHours) : null,
  }));
  const [hours, setHours] = useState(saved?.sleepHours ?? '');
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const parsedHours = hours.trim() === '' ? null : Number(hours);
  const score = readinessScore({ ...v, sleepHours: parsedHours !== null && Number.isFinite(parsedHours) ? parsedHours : null });
  const band = readinessBand(score);

  function save(): void {
    if (parsedHours !== null && !(parsedHours >= READINESS_LIMITS.minSleepHours && parsedHours <= READINESS_LIMITS.maxSleepHours)) {
      return setError(`Sleep hours must be between 0 and ${READINESS_LIMITS.maxSleepHours}.`);
    }
    setError(undefined);
    start(async () => {
      const res = await saveReadiness({ date: today, ...v, sleepHours: parsedHours === null ? null : Math.round(parsedHours * 10) / 10 });
      if (!res.ok) return setError(res.error);
      toast.show({ message: `Readiness saved (${res.data.score}/100)`, tone: 'ok' });
    });
  }

  return (
    <div className="flex h-full flex-col justify-between gap-5 rounded-md border border-line bg-card p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="font-mono text-label-sm uppercase text-primary">PRE-WORKOUT SURVEY</span>
            <h2 className="font-display text-title-md text-ink">Daily Readiness Check</h2>
          </div>
          <span className={clsx('rounded-full border px-3 py-1 font-mono text-label-sm', BAND_CLASS[band])} aria-live="polite">
            Score: {score} / 100
          </span>
        </div>
        <p className="text-label-md text-muted">
          {saved ? `Saved today at ${saved.score}/100 · ` : 'Not saved today · '}
          {READINESS_BAND_LABELS[band]}
        </p>

        <div className="flex flex-col gap-3">
          {SCALES.map((row) => (
            <div key={row.key} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-canvas-low px-4 py-3">
              <div>
                <span className="block font-sans text-label-md font-semibold text-ink">{row.label}</span>
                <span className="text-label-sm text-muted">{row.hint}</span>
              </div>
              <div className="inline-flex gap-1" role="radiogroup" aria-label={row.label}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = v[row.key] === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={`${row.label} ${n} of 5`}
                      onClick={() => setV((prev) => ({ ...prev, [row.key]: n }))}
                      className={clsx(
                        'size-8 rounded-full border font-mono text-label-sm transition-colors',
                        active ? 'border-primary bg-primary text-primary-ink' : 'border-line bg-card text-muted hover:text-ink',
                      )}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 rounded-sm border border-line bg-canvas-low px-4 py-3">
            <Label htmlFor="rd-hours" className="mb-0 normal-case tracking-normal text-ink">
              Sleep hours (optional)
            </Label>
            <Input id="rd-hours" className="w-24" type="number" inputMode="decimal" min={0} max={READINESS_LIMITS.maxSleepHours} step={0.1} value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
        </div>
        <FormError>{error}</FormError>
      </div>

      <Button size="lg" className="w-full" onClick={save} disabled={pending} aria-busy={pending}>
        {pending ? 'Saving…' : saved ? 'Update Today’s Readiness' : 'Save Today’s Readiness'}
      </Button>
    </div>
  );
}

function CycleContext({ today, cycle }: { today: string; cycle: CycleContextDto | null }) {
  const toast = useToast();
  const todays = cycle?.entries.find((e) => e.date === today) ?? null;
  const [editing, setEditing] = useState(false);
  const [periodStart, setPeriodStart] = useState(todays?.periodStart ?? false);
  const [length, setLength] = useState(String(todays?.cycleLengthDays ?? cycle?.summary?.cycleLengthDays ?? CYCLE_LIMITS.defaultLength));
  const [symptoms, setSymptoms] = useState<CycleSymptom[]>(todays?.symptoms ?? []);
  const [note, setNote] = useState(todays?.note ?? '');
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  if (!cycle || !cycle.configured) {
    return (
      <div className="flex h-full flex-col gap-3 rounded-md border border-line bg-card p-6">
        <div className="flex items-center gap-2">
          <Icon icon={Lock} className="text-primary" />
          <h2 className="font-display text-title-md text-ink">Cycle Training Context</h2>
        </div>
        <p className="text-body-md text-muted">Cycle logging is unavailable on this server right now. Nothing is stored in your browser.</p>
      </div>
    );
  }

  const summary = cycle.summary;
  const shared = cycle.sharedWithCoach;

  function save(): void {
    const n = Number(length);
    if (periodStart && !(Number.isInteger(n) && n >= CYCLE_LIMITS.minLength && n <= CYCLE_LIMITS.maxLength)) {
      return setError(`Cycle length must be a whole number from ${CYCLE_LIMITS.minLength} to ${CYCLE_LIMITS.maxLength} days.`);
    }
    setError(undefined);
    start(async () => {
      const res = await saveCycleEntry({ date: today, periodStart, cycleLengthDays: periodStart ? n : null, symptoms, note: note.trim() || null });
      if (!res.ok) return setError(res.error);
      toast.show({ message: 'Private cycle log saved', tone: 'ok' });
      setEditing(false);
    });
  }

  function toggleShare(): void {
    start(async () => {
      const res = await setCycleSharing(!shared);
      toast.show(res.ok ? { message: shared ? 'Coach can no longer see your phase' : 'Coach can now see your phase and cycle day only', tone: 'ok' } : { message: res.error, tone: 'error' });
    });
  }

  return (
    <div className="flex h-full flex-col justify-between gap-5 rounded-md border border-line bg-card p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon icon={Lock} className="text-primary" />
            <h2 className="font-display text-title-md text-ink">Cycle Training Context</h2>
          </div>
          <span className="rounded-full border border-line bg-raised px-2.5 py-0.5 font-mono text-label-sm text-muted">{shared ? 'Phase shared · Encrypted' : 'Private · Encrypted'}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-canvas-low p-4">
          <div>
            <span className="font-mono text-label-sm uppercase text-sky">CURRENT PHASE</span>
            <p className="mt-0.5 font-display text-title-md text-ink">
              {summary ? `Day ${summary.dayOfCycle} · ${CYCLE_PHASE_META[summary.phase].label}` : 'Log a period start to see your phase'}
            </p>
            {summary?.overdue ? <p className="text-label-sm text-amber">Past your usual {summary.cycleLengthDays}-day length. Log the next start when it comes.</p> : null}
          </div>
          {summary ? (
            <span className="rounded-full border border-emerald/40 bg-emerald-bg px-2.5 py-0.5 font-mono text-label-sm text-emerald">{CYCLE_PHASE_META[summary.phase].cue}</span>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-sm border border-line bg-canvas-low p-4">
          <div>
            <p id="share-label" className="font-sans text-label-md font-semibold text-ink">
              Share phase context with coach
            </p>
            <p id="share-hint" className="text-label-sm text-muted">
              Off by default. Your coach sees phase and cycle day only, never symptoms or notes.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={shared}
            aria-labelledby="share-label"
            aria-describedby="share-hint"
            disabled={pending || cycle.entries.length === 0}
            onClick={toggleShare}
            className={clsx(
              'shrink-0 rounded-full border px-3 py-1 font-mono text-label-sm transition-colors disabled:opacity-50',
              shared ? 'border-primary bg-primary-container text-primary' : 'border-line bg-raised text-muted hover:text-ink',
            )}
          >
            {shared ? 'ON' : 'OFF'}
          </button>
        </div>

        {editing ? (
          <fieldset className="flex flex-col gap-3 rounded-sm border border-line bg-canvas-low p-4">
            <legend className="px-1 font-sans text-label-sm uppercase tracking-wider text-muted">Today · private</legend>
            <label className="flex items-center gap-2 text-label-md text-ink">
              <input type="checkbox" checked={periodStart} onChange={(e) => setPeriodStart(e.target.checked)} className="size-4 accent-primary" />
              Period started today
            </label>
            {periodStart ? (
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="cy-length" className="mb-0 normal-case tracking-normal text-ink">
                  Usual cycle length (days)
                </Label>
                <Input id="cy-length" className="w-24" type="number" inputMode="numeric" min={CYCLE_LIMITS.minLength} max={CYCLE_LIMITS.maxLength} value={length} onChange={(e) => setLength(e.target.value)} />
              </div>
            ) : null}
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Symptoms">
              {CYCLE_SYMPTOMS.map((s) => {
                const on = symptoms.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSymptoms((list) => (on ? list.filter((x) => x !== s) : [...list, s]))}
                    className={clsx(
                      'rounded-full border px-3 py-1 font-sans text-label-sm transition-colors',
                      on ? 'border-primary bg-primary-container text-primary' : 'border-line bg-card text-muted hover:text-ink',
                    )}
                  >
                    {CYCLE_SYMPTOM_LABELS[s]}
                  </button>
                );
              })}
            </div>
            <label htmlFor="cy-note" className="sr-only">
              Private note
            </label>
            <textarea
              id="cy-note"
              rows={2}
              maxLength={CYCLE_LIMITS.maxNote}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Private energy or symptom notes (encrypted, never shown to your coach)"
              className="w-full rounded-sm border border-line bg-card px-3.5 py-2 text-body-md text-ink placeholder:text-faint focus:border-primary focus:outline-none"
            />
            <FormError>{error}</FormError>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
                Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={pending} aria-busy={pending}>
                {pending ? 'Saving…' : 'Save private log'}
              </Button>
            </div>
          </fieldset>
        ) : null}
      </div>

      {!editing ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full rounded-full border border-line bg-canvas-low py-2.5 font-sans text-label-md font-semibold text-ink transition-colors hover:border-primary"
        >
          {todays ? 'Edit Today’s Cycle Log' : 'Log Cycle Symptoms & Notes'}
        </button>
      ) : null}
    </div>
  );
}
