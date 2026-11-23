import clsx from 'clsx';

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-flex items-baseline gap-1.5 whitespace-nowrap', className)}>
      <span className="font-display text-[17px] font-bold tracking-[-0.03em]" style={{ fontStretch: '75%' }}>
        MUR
      </span>
      <span className="font-mono text-micro uppercase text-muted">Coaching</span>
    </span>
  );
}
