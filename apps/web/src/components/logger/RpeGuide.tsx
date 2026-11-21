'use client';

import clsx from 'clsx';
import { useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { formatStepValue, rpeGuideRows, type RpeRow } from './logger-model';

const TONE: Record<RpeRow['tone'], string> = {
  rose: 'text-rose',
  amber: 'text-amber',
  primary: 'text-primary',
  emerald: 'text-emerald',
  ink: 'text-ink',
};

/** "RPE guide" link + bottom sheet. Tapping a row selects that RPE; the prescribed target is marked. */
export function RpeGuide({
  target,
  current,
  onSelect,
}: {
  target: number | null;
  current?: number | null;
  onSelect: (rpe: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const rows = rpeGuideRows(target);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-6 text-xs font-semibold text-primary-soft underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        RPE guide
      </button>
      {open ? (
        <Sheet open={open} onClose={() => setOpen(false)} variant="bottom" title="Tap to select RPE" description="How many clean reps you had left after the set.">
          <ul className="space-y-2.5">
            {rows.map((row) => {
              const isTarget = target !== null && row.rpe === target;
              const selected = current === row.rpe;
              return (
                <li key={row.rpe}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      onSelect(row.rpe);
                      setOpen(false);
                    }}
                    className={clsx(
                      'flex min-h-14 w-full items-center justify-between gap-3 rounded-md border p-3.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
                      isTarget ? 'border-primary bg-primary-container' : 'border-line bg-canvas-low hover:bg-raised',
                      selected && !isTarget && 'border-line-strong',
                    )}
                  >
                    <span>
                      <span className={clsx('block font-display text-lg font-bold tabular', isTarget ? 'text-primary' : TONE[row.tone])}>
                        RPE {formatStepValue('rpe', row.rpe)}
                      </span>
                      <span className={clsx('block text-sm', isTarget ? 'text-primary-soft' : 'text-muted')}>
                        {row.note}
                        {isTarget ? ' (Target)' : ''}
                      </span>
                    </span>
                    {selected ? (
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 shrink-0 text-primary" fill="currentColor">
                        <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1.2 14.4-4-4 1.4-1.4 2.6 2.6 5-5 1.4 1.4-6.4 6.4z" />
                      </svg>
                    ) : (
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m9 6 6 6-6 6" />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </Sheet>
      ) : null}
    </>
  );
}
