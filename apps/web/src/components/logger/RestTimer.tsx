'use client';

import clsx from 'clsx';
import { Timer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { formatClock, restClock } from './logger-model';

/** Starts when a set is logged; ticks once a second only while running. */
export function useRestTimer(): {
  startedAt: number | null;
  start: () => void;
  reset: () => void;
  adjust: (deltaSeconds: number) => void;
  now: number;
} {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt === null) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  function adjust(deltaSeconds: number) {
    setStartedAt((prev) => {
      const base = prev ?? Date.now();
      return base + deltaSeconds * 1000;
    });
    setNow(Date.now());
  }

  return {
    startedAt,
    start: () => {
      const t = Date.now();
      setStartedAt(t);
      setNow(t);
    },
    reset: () => setStartedAt(null),
    adjust,
    now,
  };
}

/** Compact header readout: counts down the prescribed rest (or up when none) after each set. */
export function RestPill({ startedAt, now, restSeconds }: { startedAt: number | null; now: number; restSeconds: number | null }) {
  const clock = restClock(startedAt, now, restSeconds);
  const idle = startedAt === null;
  const pct = !idle && restSeconds ? Math.min(100, Math.max(0, Math.round(((now - (startedAt ?? now)) / 1000 / restSeconds) * 100))) : 0;
  return (
    <span
      role="timer"
      aria-label={idle ? 'Rest timer, starts after your next set' : clock.done ? 'Rest complete' : `Rest ${clock.mode === 'down' ? 'remaining' : 'elapsed'}`}
      className={clsx(
        'relative inline-flex shrink-0 items-center gap-1.5 pb-1 font-mono text-metric tabular-nums',
        clock.done ? 'text-emerald' : idle ? 'text-faint' : 'text-primary',
      )}
    >
      <Icon icon={Timer} size={20} />
      {formatClock(clock.seconds)}
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-line">
        <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </span>
      <span className="sr-only" aria-live="polite">
        {clock.done ? 'Rest complete' : ''}
      </span>
    </span>
  );
}

/** Stitch right-rail Rest Timer widget (`athlete_web_active_workout_logger`). */
export function RestTimerCard({
  startedAt,
  now,
  restSeconds,
  onStart,
  onReset,
  onAdjust,
}: {
  startedAt: number | null;
  now: number;
  restSeconds: number | null;
  onStart: () => void;
  onReset: () => void;
  onAdjust: (deltaSeconds: number) => void;
}) {
  const target = restSeconds ?? 180;
  const clock = restClock(startedAt, now, target);
  const idle = startedAt === null;

  return (
    <section className="flex flex-col gap-4 rounded-md border border-line bg-card p-6">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-label-sm uppercase text-muted">REST TIMER</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary-container px-2.5 py-0.5 font-mono text-label-sm text-primary">
          Target {formatClock(target)}
        </span>
      </div>

      <p
        className={clsx(
          'py-2 text-center font-mono text-headline-lg tabular-nums',
          clock.done ? 'text-emerald' : idle ? 'text-ink' : 'text-primary',
        )}
      >
        {idle ? formatClock(target) : formatClock(clock.seconds)}
      </p>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onAdjust(-30)}
          className="rounded-full border border-line-strong bg-canvas-low py-2 font-mono text-label-md text-ink transition-colors hover:border-primary"
        >
          -30s
        </button>
        <button
          type="button"
          onClick={idle ? onStart : onReset}
          className="rounded-full bg-primary py-2 font-sans text-label-md font-semibold text-primary-ink transition-opacity hover:opacity-90"
        >
          {idle ? 'Start' : 'Reset'}
        </button>
        <button
          type="button"
          onClick={() => onAdjust(30)}
          className="rounded-full border border-line-strong bg-canvas-low py-2 font-mono text-label-md text-ink transition-colors hover:border-primary"
        >
          +30s
        </button>
      </div>
    </section>
  );
}
