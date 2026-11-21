import clsx from 'clsx';
import type { ReactNode } from 'react';

export type BadgeTone = 'emerald' | 'amber' | 'sky' | 'slate' | 'red' | 'indigo';

const TONES: Record<BadgeTone, string> = {
  emerald: 'bg-emerald-bg text-emerald ring-emerald/30',
  amber: 'bg-amber-bg text-amber ring-amber/30',
  sky: 'bg-sky-bg text-sky ring-sky/30',
  slate: 'bg-raised text-muted ring-line-strong',
  red: 'bg-rose-bg text-rose ring-rose/30',
  indigo: 'bg-primary-container text-primary ring-primary/30',
};

/** Always carries text: colour is never the only signal. */
export function Badge({ tone = 'slate', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset',
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
