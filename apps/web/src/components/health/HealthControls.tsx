'use client';

import { Upload } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';
import { HEALTH_LIMITS } from '@coaching/shared';
import type { HealthMetricInput, HealthSource } from '@coaching/shared';
import { saveStepGoal, syncHealthMetrics } from '@/actions/health';
import { setShareStats } from '@/actions/social';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { chunk, parseAppleHealthXml, parseHealthCsv } from './health-import';

const intOrNull = (raw: FormDataEntryValue | null): number | null => {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : Number.NaN;
};

export function StepGoalForm({ goal }: { goal: number }) {
  const toast = useToast();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  function submit(form: FormData): void {
    const n = intOrNull(form.get('goal'));
    if (n === null || Number.isNaN(n) || n < HEALTH_LIMITS.minGoal || n > HEALTH_LIMITS.maxGoal) return setError(`Pick ${HEALTH_LIMITS.minGoal.toLocaleString('en-US')}–${HEALTH_LIMITS.maxGoal.toLocaleString('en-US')} steps.`);
    setError(undefined);
    start(async () => {
      const res = await saveStepGoal(n);
      if (!res.ok) return setError(res.error);
      toast.show({ message: 'Step goal saved', tone: 'ok' });
    });
  }
  return (
    <form action={submit} className="flex flex-wrap items-end gap-2">
      <div>
        <Label htmlFor="step-goal">Daily goal</Label>
        <Input id="step-goal" name="goal" type="number" inputMode="numeric" step="500" min={HEALTH_LIMITS.minGoal} max={HEALTH_LIMITS.maxGoal} defaultValue={goal} className="w-32" />
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        Save goal
      </Button>
      <div className="w-full">
        <FormError>{error}</FormError>
      </div>
    </form>
  );
}

/** Manual day entry. Re-entering a day replaces that day's manual row; device imports stay separate. */
export function ManualEntryForm({ today }: { today: string }) {
  const toast = useToast();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  function submit(form: FormData): void {
    const hours = Number(String(form.get('sleepHours') ?? '').trim() || 'NaN');
    const entry: HealthMetricInput = {
      date: String(form.get('date') ?? today),
      steps: intOrNull(form.get('steps')),
      sleepMinutes: Number.isFinite(hours) ? Math.round(hours * 60) : null,
      hrvMs: intOrNull(form.get('hrv')),
      restingHr: intOrNull(form.get('rhr')),
    };
    if ([entry.steps, entry.hrvMs, entry.restingHr].some((v) => Number.isNaN(v))) return setError('Use whole numbers.');
    if (entry.steps === null && entry.sleepMinutes === null && entry.hrvMs === null && entry.restingHr === null) return setError('Enter at least one value.');
    setError(undefined);
    start(async () => {
      const res = await syncHealthMetrics('MANUAL', [entry]);
      if (!res.ok) return setError(res.error);
      toast.show({ message: 'Day saved', tone: 'ok' });
    });
  }
  return (
    <form action={submit} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <div className="col-span-2 sm:col-span-1">
        <Label htmlFor="he-date">Date</Label>
        <Input id="he-date" name="date" type="date" defaultValue={today} max={today} required />
      </div>
      <div>
        <Label htmlFor="he-steps">Steps</Label>
        <Input id="he-steps" name="steps" type="number" inputMode="numeric" min="0" max={HEALTH_LIMITS.maxSteps} />
      </div>
      <div>
        <Label htmlFor="he-sleep">Sleep (h)</Label>
        <Input id="he-sleep" name="sleepHours" type="number" inputMode="decimal" step="0.25" min="0" max="24" />
      </div>
      <div>
        <Label htmlFor="he-hrv">HRV (ms)</Label>
        <Input id="he-hrv" name="hrv" type="number" inputMode="numeric" min={HEALTH_LIMITS.minHrvMs} max={HEALTH_LIMITS.maxHrvMs} />
      </div>
      <div>
        <Label htmlFor="he-rhr">Resting HR</Label>
        <Input id="he-rhr" name="rhr" type="number" inputMode="numeric" min={HEALTH_LIMITS.minRestingHr} max={HEALTH_LIMITS.maxRestingHr} />
      </div>
      <div className="col-span-2 flex items-center gap-3 sm:col-span-5">
        <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
          {pending ? 'Saving…' : 'Save day'}
        </Button>
        <FormError>{error}</FormError>
      </div>
    </form>
  );
}

const MAX_FILE_BYTES = 500 * 1024 * 1024;

/**
 * Parses the file in the browser (Apple's export.xml can be hundreds of MB) and sends only daily totals, in
 * batches, through the server action. The file itself never leaves the device.
 */
export function HealthFileImport({ kind, label }: { kind: 'apple' | 'csv'; label: string }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const source: HealthSource = kind === 'apple' ? 'APPLE_HEALTH' : 'CSV';

  function onFile(file: File | undefined): void {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) return setError('That file is over 500 MB. Export a shorter range.');
    setError(undefined);
    start(async () => {
      try {
        setStatus('Reading file…');
        const text = await file.text();
        const days = kind === 'apple' ? parseAppleHealthXml(text) : parseHealthCsv(text);
        if (days.length === 0) return setError('No daily steps, sleep, HRV or resting HR found in that file.');
        let done = 0;
        for (const batch of chunk(days, HEALTH_LIMITS.maxBatch)) {
          setStatus(`Syncing ${done + batch.length} of ${days.length} days…`);
          const res = await syncHealthMetrics(source, batch);
          if (!res.ok) return setError(res.error);
          done += batch.length;
        }
        toast.show({ message: `${days.length} days synced`, tone: 'ok' });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not read that file.');
      } finally {
        setStatus(undefined);
        if (input.current) input.current.value = '';
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={input}
        type="file"
        accept={kind === 'apple' ? '.xml,text/xml,application/xml' : '.csv,text/csv'}
        className="sr-only"
        id={`health-file-${kind}`}
        onChange={(e) => onFile(e.target.files?.[0])}
        disabled={pending}
      />
      <label
        htmlFor={`health-file-${kind}`}
        aria-disabled={pending}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-line bg-canvas-low py-1.5 text-center font-sans text-label-sm font-semibold text-primary transition-colors hover:border-primary focus-within:ring-2 focus-within:ring-primary"
      >
        <Icon icon={Upload} size={16} />
        {pending ? 'Working…' : label}
      </label>
      <p role="status" aria-live="polite" className="text-label-sm text-muted">
        {status}
      </p>
      <FormError>{error}</FormError>
    </div>
  );
}

export function ShareStatsToggle({ groupId, sharing }: { groupId: string; sharing: boolean }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={sharing ? 'ghost' : 'primary'}
      disabled={pending}
      aria-pressed={sharing}
      onClick={() =>
        start(async () => {
          const res = await setShareStats(groupId, !sharing);
          toast.show(res.ok ? { message: sharing ? 'Stopped sharing stats' : 'Sharing steps and PRs with this group', tone: 'ok' } : { message: res.error, tone: 'error' });
        })
      }
    >
      {sharing ? 'Stop sharing my stats' : 'Share my steps & PRs'}
    </Button>
  );
}
