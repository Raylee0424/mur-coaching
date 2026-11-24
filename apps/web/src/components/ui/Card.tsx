import clsx from 'clsx';
import type { ComponentProps, ReactNode } from 'react';

export function Card({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={clsx('rounded-md border border-line bg-card', className)} {...rest} />;
}

/** Stitch slate card container with a 1px header divider. Tables go edge-to-edge; prose adds padding. */
export function Panel({
  title,
  meta,
  actions,
  children,
  className,
}: {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx('overflow-hidden rounded-md border border-line bg-card', className)}>
      <header className="flex min-h-14 items-center justify-between gap-3 border-b border-line px-6 py-3.5">
        <div className="flex min-w-0 items-baseline gap-3">
          <h2 className="truncate font-display text-title-md text-ink">{title}</h2>
          {meta ? <span className="truncate font-mono text-label-sm text-muted tabular-nums">{meta}</span> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}
