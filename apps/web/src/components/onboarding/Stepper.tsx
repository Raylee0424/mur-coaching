import clsx from 'clsx';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';

interface StepHeaderProps {
  steps: readonly string[];
  current: number;
  variant?: 'bars' | 'tabs';
  /** Lets people jump back to a step they already passed. */
  onSelect?: ((index: number) => void) | undefined;
}

export function StepBars({ count, current }: { count: number; current: number }) {
  return (
    <ol className="flex gap-1.5" aria-label="Progress">
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          aria-current={i === current ? 'step' : undefined}
          className={clsx('h-1.5 flex-1 rounded-full transition-colors', i <= current ? 'bg-primary' : 'bg-raised')}
        >
          <span className="sr-only">
            Step {i + 1}
            {i < current ? ' (done)' : ''}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Stitch horizontal step cards: emerald completed, electric-lime active, dark-slate upcoming. */
export function StepHeader({ steps, current, onSelect }: StepHeaderProps) {
  const cols =
    steps.length === 4
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : steps.length === 3
        ? 'md:grid-cols-3'
        : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6';

  return (
    <nav aria-label="Onboarding Steps" className="space-y-3">
      <div className="flex items-center justify-between md:hidden">
        <span className="font-mono text-label-sm uppercase text-primary">
          STEP {current + 1} OF {steps.length}
        </span>
        <span className="font-display text-label-lg text-ink">{steps[current]}</span>
      </div>
      <div className="md:hidden">
        <StepBars count={steps.length} current={current} />
      </div>
      <ol className={clsx('hidden gap-3 md:grid', cols)}>
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          const clickable = Boolean(onSelect && done);
          const cardCls = clsx(
            'flex w-full items-center gap-3 rounded-md border p-3.5 text-left transition-colors',
            active
              ? 'border-primary bg-raised'
              : done
                ? 'border-emerald/40 bg-card hover:bg-raised/70'
                : 'border-line bg-canvas-low',
          );
          const inner = (
            <>
              <span
                className={clsx(
                  'inline-flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-label-sm',
                  active
                    ? 'bg-primary text-primary-ink'
                    : done
                      ? 'border border-emerald/40 bg-emerald-bg text-emerald'
                      : 'border border-line bg-card text-muted',
                )}
              >
                {done ? <Icon icon={Check} size={14} /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={clsx(
                    'block font-mono text-[10px] font-semibold uppercase tracking-wider',
                    active ? 'text-primary' : done ? 'text-emerald' : 'text-muted',
                  )}
                >
                  STEP {i + 1}
                  {done ? ' · DONE' : active ? ' · ACTIVE' : ''}
                </span>
                <span className={clsx('mt-0.5 block truncate font-display text-label-lg', active || done ? 'text-ink' : 'text-muted')}>
                  {s}
                </span>
              </span>
            </>
          );

          return (
            <li key={s} aria-current={active ? 'step' : undefined} className="min-w-0">
              {clickable ? (
                <button type="button" onClick={() => onSelect?.(i)} className={cardCls}>
                  {inner}
                </button>
              ) : (
                <div className={cardCls}>{inner}</div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function StepTitle({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-display text-headline-md text-ink">{title}</h1>
      {subtitle ? <p className="font-sans text-body-md text-muted">{subtitle}</p> : null}
    </div>
  );
}
