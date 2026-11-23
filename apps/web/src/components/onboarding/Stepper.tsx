import clsx from 'clsx';
import type { ReactNode } from 'react';

interface StepHeaderProps {
  steps: readonly string[];
  current: number;
  /** `bars`: label + progress bars (client, mobile first). `tabs`: labelled step cells (coach, wide). */
  variant?: 'bars' | 'tabs';
  /** Tabs only: lets people jump back to a step they already passed. */
  onSelect?: ((index: number) => void) | undefined;
}

export function StepBars({ count, current }: { count: number; current: number }) {
  return (
    <ol className="flex gap-1.5" aria-label="Progress">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} aria-current={i === current ? 'step' : undefined} className={clsx('h-1.5 flex-1 rounded-full', i <= current ? 'bg-primary' : 'bg-line-strong')}>
          <span className="sr-only">
            Step {i + 1}
            {i < current ? ' (done)' : ''}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Progress header for the onboarding steppers. */
export function StepHeader({ steps, current, variant = 'bars', onSelect }: StepHeaderProps) {
  if (variant === 'tabs') {
    return (
      <nav aria-label="Onboarding steps">
        <ol className="grid grid-cols-4 gap-2 sm:gap-3">
          {steps.map((s, i) => {
            const active = i === current;
            const cls = clsx(
              'block w-full rounded-md border p-2.5 text-left sm:p-3',
              active ? 'border-primary bg-raised' : 'border-line bg-canvas-low',
              onSelect && i < current && 'hover:border-line-strong',
            );
            const body = (
              <>
                <span className={clsx('block text-[11px] font-semibold uppercase tracking-wider', active ? 'text-primary' : 'text-muted')}>Step {i + 1}</span>
                <span className={clsx('mt-0.5 block text-xs font-semibold sm:text-sm', active ? 'text-ink' : 'text-muted')}>
                  {s}
                  {i < current ? <span className="sr-only"> (done)</span> : null}
                </span>
              </>
            );
            return (
              <li key={s} aria-current={active ? 'step' : undefined}>
                {onSelect && i < current ? (
                  <button type="button" onClick={() => onSelect(i)} className={clsx(cls, '')}>
                    {body}
                  </button>
                ) : (
                  <div className={cls}>{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
        Step {current + 1} of {steps.length} · {steps[current]}
      </p>
      <StepBars count={steps.length} current={current} />
    </div>
  );
}

export function StepTitle({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
    </div>
  );
}
