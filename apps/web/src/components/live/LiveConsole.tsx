'use client';

import { LIVE_LIMITS, LIVE_MODE_LABELS } from '@coaching/shared';
import type { LiveSessionDto, LiveSetDto, WeightUnit } from '@coaching/shared';
import clsx from 'clsx';
import { Wifi, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { endLiveSession, logLiveSet, removeLiveSet } from '@/actions/live';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { displayToKg, unitLabel, unitStep } from '@/lib/units';
import { dequeue, enqueue, kgString, newRequestId, parseQueue, queueKey, toRequest, type QueuedSet } from './live-model';
import { LiveFeed } from './LiveFeed';

const RPES = ['', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10'];

/**
 * Coach logging panel. Offline mode (or a failed request) keeps sets in localStorage; they replay in order when
 * back online. Each carries a request id, so a replay of a set that did land is ignored by the API.
 */
export function LiveConsole({ initial, exercises, unit }: { initial: LiveSessionDto; exercises: { id: string; name: string }[]; unit: WeightUnit }) {
  const toast = useToast();
  const [session, setSession] = useState(initial);
  const [clientId, setClientId] = useState(initial.participants[0]?.clientId ?? '');
  const [offline, setOffline] = useState(false);
  const [queue, setQueue] = useState<QueuedSet[]>([]);
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? '');
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const flushing = useRef(false);
  const key = queueKey(session.id);

  useEffect(() => setQueue(parseQueue(window.localStorage.getItem(key))), [key]);
  const store = useCallback(
    (next: QueuedSet[]) => {
      setQueue(next);
      window.localStorage.setItem(key, JSON.stringify(next));
    },
    [key],
  );

  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    let q = parseQueue(window.localStorage.getItem(key));
    try {
      for (const item of q) {
        const res = await logLiveSet(session.id, toRequest(item));
        q = dequeue(q, item.requestId);
        store(q);
        if (res.ok) setSession(res.data);
        else toast.show({ message: `A queued ${item.exerciseName} set was refused: ${res.error}`, tone: 'error' });
      }
    } catch {
      // Still offline: keep the rest for the next attempt.
    } finally {
      flushing.current = false;
    }
  }, [key, session.id, store, toast]);

  useEffect(() => {
    if (offline) return;
    void flush();
    const onOnline = () => void flush();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [offline, flush]);

  const participant = session.participants.find((p) => p.clientId === clientId);

  function submit(form: FormData): void {
    setError(undefined);
    const weight = Number(form.get('weight'));
    const reps = Number(form.get('reps'));
    if (!clientId || !exerciseId) return setError('Pick an athlete and an exercise.');
    if (!Number.isFinite(weight) || weight < 0) return setError('Enter a weight.');
    if (!Number.isInteger(reps) || reps < 1 || reps > LIVE_LIMITS.maxReps) return setError('Reps are a whole number from 1.');
    const weightKg = displayToKg(weight, unit);
    if (weightKg > LIVE_LIMITS.maxWeightKg) return setError('That weight is out of range.');
    const item: QueuedSet = {
      requestId: newRequestId(),
      clientId,
      exerciseId,
      exerciseName: exercises.find((e) => e.id === exerciseId)?.name ?? 'Exercise',
      weightKg: kgString(weightKg),
      reps,
      rpe: String(form.get('rpe') || '') || null,
      cue: String(form.get('cue') ?? '').trim() || null,
    };
    const cueField = document.getElementById('lv-cue') as HTMLInputElement | null;
    if (offline || !navigator.onLine) {
      store(enqueue(queue, item));
      if (cueField) cueField.value = '';
      return;
    }
    start(async () => {
      try {
        const res = await logLiveSet(session.id, toRequest(item));
        if (!res.ok) return setError(res.error);
        setSession(res.data);
      } catch {
        store(enqueue(parseQueue(window.localStorage.getItem(key)), item));
        toast.show({ message: 'Connection lost. The set is queued and will sync.', tone: 'neutral' });
      }
      if (cueField) cueField.value = '';
    });
  }

  const remove = (s: LiveSetDto) =>
    start(async () => {
      const res = await removeLiveSet(session.id, s.setLogId);
      if (!res.ok) return setError(res.error);
      setSession(res.data);
    });

  const end = () => {
    if (queue.length) return setError('Sync the queued sets before ending: turn offline mode off while connected.');
    if (!window.confirm('End this session? Logged sets stay in each athlete’s history.')) return;
    start(async () => {
      const res = await endLiveSession(session.id);
      if (!res.ok) return setError(res.error);
      window.localStorage.removeItem(key);
      toast.show({ message: 'Session ended', tone: 'ok' });
    });
  };

  const queuedHere = queue.filter((q) => q.clientId === clientId);
  const total = session.participants.reduce((n, p) => n + p.sets.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span
            role="status"
            className={clsx(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1 font-sans text-label-sm',
              offline ? 'border-amber/40 bg-amber-bg text-amber' : 'border-emerald/40 bg-emerald-bg text-emerald',
            )}
          >
            <span className={clsx('size-2 rounded-full', offline ? 'bg-amber' : 'bg-emerald')} aria-hidden="true" />
            {offline ? `Offline Queue (${queue.length})` : queue.length ? `Syncing ${queue.length}…` : 'Live Stream Active'}
          </span>
          <Badge tone="sky">{LIVE_MODE_LABELS[session.mode]}</Badge>
          <span className="font-mono text-label-sm text-muted tabular-nums">{total} sets logged</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            role="switch"
            aria-checked={offline}
            onClick={() => setOffline((o) => !o)}
            className={clsx(
              'inline-flex items-center gap-2 rounded-full border px-4 py-2 font-sans text-label-md transition-colors',
              offline
                ? 'border-amber/50 bg-amber-bg text-amber'
                : 'border-line-strong bg-raised text-ink hover:border-primary',
            )}
          >
            {offline ? <WifiOff size={16} aria-hidden="true" /> : <Wifi size={16} className="text-emerald" aria-hidden="true" />}
            Offline In-Person Mode: {offline ? 'ON' : 'OFF'}
          </button>
          <Button size="sm" variant="danger" onClick={end} disabled={pending}>
            End Session
          </Button>
        </div>
      </div>

      {session.participants.length > 1 ? (
        <div role="tablist" aria-label="Athletes" className="flex gap-4 relative overflow-x-auto border-b border-line">
          {session.participants.map((p) => (
            <button
              key={p.clientId}
              role="tab"
              type="button"
              aria-selected={p.clientId === clientId}
              onClick={() => setClientId(p.clientId)}
              className={clsx(
                'inline-flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 font-sans text-label-lg transition-colors',
                p.clientId === clientId ? 'border-primary text-ink' : 'border-transparent text-muted hover:text-ink',
              )}
            >
              {p.clientName}
              <span className="rounded-full border border-line bg-card px-2 py-0.5 font-mono text-label-sm text-muted tabular-nums">
                {p.sets.length}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <section className="flex flex-col gap-4 rounded-md border border-line bg-card p-6 lg:col-span-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="font-sans text-label-sm uppercase tracking-wider text-primary">REAL-TIME ATHLETE STREAM</span>
              <h2 className="mt-0.5 font-display text-title-lg text-ink">{participant?.clientName ?? 'Athlete'}</h2>
            </div>
            <span className="font-mono text-label-md text-muted tabular-nums">{participant?.sets.length ?? 0} sets logged</span>
          </div>
          <LiveFeed sets={participant?.sets ?? []} queued={queuedHere} unit={unit} onRemove={remove} busy={pending} />
        </section>

        <aside className="flex flex-col gap-5 rounded-md border border-line bg-card p-6 lg:col-span-5">
          <div>
            <span className="font-sans text-label-sm uppercase tracking-wider text-primary">COACH LOGGING PANEL</span>
            <h2 className="mt-0.5 font-display text-title-lg text-ink">Log Set for Athlete</h2>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(new FormData(e.currentTarget));
            }}
            className="flex flex-col gap-4"
          >
            <div>
              <Label htmlFor="lv-ex">Exercise</Label>
              <Select size="lg" id="lv-ex" value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
                {exercises.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="lv-w">Weight ({unitLabel(unit)})</Label>
                <Input size="lg" id="lv-w" name="weight" type="number" inputMode="decimal" min={0} step={unitStep(unit) / 2} required />
              </div>
              <div>
                <Label htmlFor="lv-r">Reps</Label>
                <Input size="lg" id="lv-r" name="reps" type="number" inputMode="numeric" min={1} max={LIVE_LIMITS.maxReps} required />
              </div>
              <div>
                <Label htmlFor="lv-rpe">RPE</Label>
                <Select size="lg" id="lv-rpe" name="rpe" defaultValue="" className="text-primary">
                  {RPES.map((r) => (
                    <option key={r} value={r}>
                      {r || '—'}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="lv-cue">In-person cue / note</Label>
              <Input size="lg" id="lv-cue" name="cue" maxLength={LIVE_LIMITS.maxCue} placeholder="Keep chest tall out of the hole..." />
            </div>
            <FormError>{error}</FormError>
            <Button type="submit" size="lg" className="w-full" disabled={pending || !participant} aria-busy={pending}>
              Log Set for {participant?.clientName ?? 'Athlete'}
            </Button>
            <p className="text-meta text-muted">
              Sets go straight into the athlete&apos;s history, marked as logged by you, and feed their progression.
            </p>
          </form>
        </aside>
      </div>
    </div>
  );
}
