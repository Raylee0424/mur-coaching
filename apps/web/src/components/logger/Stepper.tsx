import clsx from 'clsx';
import type { ReactNode } from 'react';

interface StepperProps {
  /** Visible label, e.g. "Weight (kg)". */
  label: string;
  /** Plain word for screen readers ("weight"). */
  noun: string;
  display: string;
  stepLabel: string;
  onStep: (direction: 1 | -1) => void;
  canDecrease?: boolean;
  canIncrease?: boolean;
  /** Smaller variant used inside sheets. */
  compact?: boolean;
  /** Optional action next to the label (e.g. "RPE guide", "Clear"). */
  action?: ReactNode;
}

/** Big +/- stepper: 48px buttons, live value. */
export function Stepper({ label, noun, display, stepLabel, onStep, canDecrease = true, canIncrease = true, compact, action }: StepperProps) {
  const button = 'flex h-12 w-14 items-center justify-center rounded-md border border-line bg-canvas-low text-sm font-semibold tabular text-ink transition-colors hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:text-muted/40 disabled:hover:border-line';
  return (
    <div role="group" aria-label={label} className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>
          {action}
        </div>
        <output aria-live="polite" className={clsx('block font-display font-bold tabular text-ink', compact ? 'text-2xl' : 'text-3xl')}>
          {display}
        </output>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={button}
          disabled={!canDecrease}
          aria-label={`Decrease ${noun} by ${stepLabel}`}
          onClick={() => onStep(-1)}
        >
          −{stepLabel}
        </button>
        <button
          type="button"
          className={button}
          disabled={!canIncrease}
          aria-label={`Increase ${noun} by ${stepLabel}`}
          onClick={() => onStep(1)}
        >
          +{stepLabel}
        </button>
      </div>
    </div>
  );
}
