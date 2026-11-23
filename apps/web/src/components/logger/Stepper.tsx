import clsx from 'clsx';
import { Minus, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';

interface StepperProps {
  /** Visible label, e.g. "Weight (kg)". */
  label: string;
  /** Plain word for screen readers ("weight"). */
  noun: string;
  display: string;
  /** Unit shown small after the value, e.g. "kg". */
  unit?: string;
  stepLabel: string;
  onStep: (direction: 1 | -1) => void;
  canDecrease?: boolean;
  canIncrease?: boolean;
  /** Smaller variant used inside sheets. */
  compact?: boolean;
  /** Optional action next to the label (e.g. "RPE guide", "Clear"). */
  action?: ReactNode;
}

/** Big +/- stepper: 44px square buttons, the live value is the largest type on screen. */
export function Stepper({ label, noun, display, unit, stepLabel, onStep, canDecrease = true, canIncrease = true, compact, action }: StepperProps) {
  const button =
    'flex size-11 items-center justify-center rounded border border-line-strong bg-transparent text-ink transition-colors hover:border-faint hover:bg-raised disabled:cursor-not-allowed disabled:text-faint disabled:hover:border-line-strong disabled:hover:bg-transparent';
  return (
    <div role="group" aria-label={label} className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-micro uppercase text-muted">{label}</span>
          {action}
        </div>
        <output aria-live="polite" className={clsx('block font-mono text-ink', compact ? 'text-metric' : 'text-metric-lg')}>
          {display}
          {unit ? <span className="ml-1 text-ui text-faint">{unit}</span> : null}
        </output>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className={button} disabled={!canDecrease} aria-label={`Decrease ${noun} by ${stepLabel}`} onClick={() => onStep(-1)}>
          <Icon icon={Minus} size={20} />
        </button>
        <button type="button" className={button} disabled={!canIncrease} aria-label={`Increase ${noun} by ${stepLabel}`} onClick={() => onStep(1)}>
          <Icon icon={Plus} size={20} />
        </button>
      </div>
    </div>
  );
}
