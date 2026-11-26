import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

export type BadgeTone = 'emerald' | 'amber' | 'sky' | 'slate' | 'red' | 'neutral' | 'signal';

const TONES: Record<BadgeTone, string> = {
  emerald: 'border-emerald/40 bg-emerald-bg text-emerald',
  sky: 'border-sky/40 bg-sky-bg text-sky',
  amber: 'border-amber/40 bg-amber-bg text-amber',
  red: 'border-rose/40 bg-rose-bg text-rose',
  slate: 'border-line bg-canvas-low text-muted',
  neutral: 'border-line-strong bg-raised text-ink',
  signal: 'border-primary/40 bg-primary-container text-primary',
};

/** Stitch pill status badge. Always carries text: colour is never the only signal. */
export function Badge({ tone = 'slate', icon, title, children }: { tone?: BadgeTone; icon?: LucideIcon; title?: string; children: ReactNode }) {
  return (
    <span
      title={title}
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-sans text-label-sm',
        TONES[tone],
      )}
    >
      {icon ? <Icon icon={icon} size={14} /> : null}
      {children}
    </span>
  );
}
