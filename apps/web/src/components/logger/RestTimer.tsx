'use client';

import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { formatClock, restClock } from './logger-model';

/** Starts when a set is logged; ticks once a second only while running. */
export function useRestTimer(): { startedAt: number | null; start: () => void; reset: () => void; now: number } {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt === null) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  return { startedAt, start: () => setStartedAt(Date.now()), reset: () => setStartedAt(null), now };
}

/** Header pill: counts down the prescribed rest (or up when none) after each set. */
export function RestPill({ startedAt, now, restSeconds }: { startedAt: number | null; now: number; restSeconds: number | null }) {
  const clock = restClock(startedAt, now, restSeconds);
  const idle = startedAt === null;
  return (
    <span
      role="timer"
      aria-label={idle ? 'Rest timer, starts after your next set' : clock.done ? 'Rest complete' : `Rest ${clock.mode === 'down' ? 'remaining' : 'elapsed'}`}
      className={clsx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold tabular',
        clock.done ? 'border-primary bg-primary-container text-primary' : 'border-line bg-card text-ink',
        idle && 'text-muted',
      )}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2 2M9 2h6" />
      </svg>
      {formatClock(clock.seconds)}
      <span className="sr-only" aria-live="polite">
        {clock.done ? 'Rest complete' : ''}
      </span>
    </span>
  );
}
