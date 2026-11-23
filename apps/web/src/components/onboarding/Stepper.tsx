import clsx from 'clsx';
import type { ReactNode } from 'react';

interface StepHeaderProps {
  steps: readonly string[];
  current: number;
  /** Kept for callers; both variants render the same rail. */
  variant?: 'bars' | 'tabs';
  /** Lets people jump back to a step they already passed. */
  onSelect?: ((index: number) => void) | undefined;
}

export function StepBars({ count, current }: { count: number; current: number }) {
  return (
    <ol className="flex gap-1" aria-label="Progress">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} aria-current={i === current ? 'step' : undefined} className={clsx('h-0.5 flex-1', i <= current ? 'bg-ink' : 'bg-line')}>
          <span className="sr-only">
            Step {i + 1}
            {i < current ? ' (done)' : ''}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Progress header for the onboarding steppers: mono step label, segments, and (md+) the step titles. */
export function StepHeader({ steps, current, onSelect }: StepHeaderProps) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-micro uppercase text-muted">
        Step {current + 1} / {steps.length} · {steps[current]}
      </p>
      <StepBars count={steps.length} current={current} />
      <ol className="hidden gap-1 md:grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-label="Steps">
        {steps.map((s, i) => (
          <li key={s} className="min-w-0">
            {onSelect && i < current ? (
              <button type="button" onClick={() => onSelect(i)} className="truncate text-meta text-muted underline underline-offset-2 hover:text-ink">
                {s}
                <span className="sr-only"> (done)</span>
              </button>
            ) : (
              <span className={clsx('block truncate text-meta', i === current ? 'text-ink' : 'text-faint')}>{s}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function StepTitle({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-h1 font-semibold">{title}</h1>
      {subtitle ? <p className="mt-1 text-body text-muted">{subtitle}</p> : null}
    </div>
  );
}
