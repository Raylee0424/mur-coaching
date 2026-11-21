import type { ReactNode } from 'react';

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="space-y-2">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
      {subtitle ? <p className="text-muted">{subtitle}</p> : null}
    </div>
  );
}

export function StatusIcon({ tone, children }: { tone: 'primary' | 'emerald' | 'amber' | 'rose'; children: ReactNode }) {
  const cls = { primary: 'bg-primary-container text-primary', emerald: 'bg-emerald-bg text-emerald', amber: 'bg-amber-bg text-amber', rose: 'bg-rose-bg text-rose' }[tone];
  return (
    <span className={`inline-flex size-14 items-center justify-center rounded-full ${cls}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-7" aria-hidden="true">
        {children}
      </svg>
    </span>
  );
}
