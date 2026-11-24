import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="font-display text-headline-md text-ink">{title}</h1>
      {subtitle ? <p className="font-sans text-body-md text-muted">{subtitle}</p> : null}
    </div>
  );
}

export function StatusIcon({ tone, icon }: { tone: 'primary' | 'emerald' | 'amber' | 'rose'; icon: LucideIcon }) {
  const cls = {
    primary: 'border-primary/40 bg-primary-container text-primary',
    emerald: 'border-emerald/40 bg-emerald-bg text-emerald',
    amber: 'border-amber/40 bg-amber-bg text-amber',
    rose: 'border-rose/40 bg-rose-bg text-rose',
  }[tone];
  return (
    <span className={clsx('inline-flex size-12 items-center justify-center rounded-sm border', cls)}>
      <Icon icon={icon} size={20} />
    </span>
  );
}
