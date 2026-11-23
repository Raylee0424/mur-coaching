'use client';

import clsx from 'clsx';
import { Timer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
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

/** Header readout: counts down the prescribed rest (or up when none) after each set, with a 2px progress bar. */
export function RestPill({ startedAt, now, restSeconds }: { startedAt: number | null; now: number; restSeconds: number | null }) {
  const clock = restClock(startedAt, now, restSeconds);
  const idle = startedAt === null;
  const pct = !idle && restSeconds ? Math.min(100, Math.round(((now - (startedAt ?? now)) / 1000 / restSeconds) * 100)) : 0;
  return (
    <span
      role="timer"
      aria-label={idle ? 'Rest timer, starts after your next set' : clock.done ? 'Rest complete' : `Rest ${clock.mode === 'down' ? 'remaining' : 'elapsed'}`}
      className={clsx('relative inline-flex shrink-0 items-center gap-1.5 pb-1 font-mono text-metric', clock.done ? 'text-emerald' : 'text-ink', idle && 'text-faint')}
    >
      <Icon icon={Timer} size={20} />
      {formatClock(clock.seconds)}
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-line">
        <span className="block h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
      </span>
      <span className="sr-only" aria-live="polite">
        {clock.done ? 'Rest complete' : ''}
      </span>
    </span>
  );
}
