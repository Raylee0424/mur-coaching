import clsx from 'clsx';
import type { ReactNode } from 'react';

/** Progress header: "Step 2 of 5" + bar (mobile) or labelled steps (wide). */
export function StepHeader({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
        Step {current + 1} of {steps.length} · {steps[current]}
      </p>
      <ol className="flex gap-1.5" aria-label="Progress">
        {steps.map((s, i) => (
          <li
            key={s}
            aria-current={i === current ? 'step' : undefined}
            className={clsx('h-1.5 flex-1 rounded-full', i <= current ? 'bg-primary' : 'bg-line-strong')}
          >
            <span className="sr-only">
              {s}
              {i < current ? ' (done)' : ''}
            </span>
          </li>
        ))}
      </ol>
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
