import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

export type BadgeTone = 'emerald' | 'amber' | 'sky' | 'slate' | 'red' | 'neutral' | 'signal';

const TONES: Record<BadgeTone, string> = {
  emerald: 'border-emerald/35 text-emerald',
  sky: 'border-sky/35 text-sky',
  amber: 'border-amber/35 text-amber',
  red: 'border-rose/35 text-rose',
  slate: 'border-line-strong text-muted',
  neutral: 'border-line-strong text-ink',
  signal: 'border-signal/40 bg-signal-bg text-signal',
};

/** Always carries text: colour is never the only signal. */
export function Badge({ tone = 'slate', icon, children }: { tone?: BadgeTone; icon?: LucideIcon; children: ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 font-mono text-micro uppercase',
        TONES[tone],
      )}
    >
      {icon ? <Icon icon={icon} size={14} /> : null}
      {children}
    </span>
  );
}
