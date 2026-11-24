import clsx from 'clsx';
import { Zap } from 'lucide-react';

/** Stitch brand mark: 32×32 electric-lime bolt tile + Plus Jakarta Sans wordmark. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5 whitespace-nowrap', className)}>
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary text-primary-ink">
        <Zap size={18} strokeWidth={2.2} fill="currentColor" aria-hidden="true" />
      </span>
      <span className="font-display text-title-md text-ink">MUR Coaching</span>
    </span>
  );
}
