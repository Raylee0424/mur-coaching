import clsx from 'clsx';
import type { ComponentProps, ReactNode } from 'react';

export function Card({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={clsx('rounded-md border border-line bg-card', className)} {...rest} />;
}

/** Card with a hairline header row. Body has no padding: tables go edge to edge, prose adds `p-4`. */
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
    <section className={clsx('rounded-md border border-line bg-card', className)}>
      <header className="flex h-11 items-center justify-between gap-3 border-b border-line px-4">
        <div className="flex min-w-0 items-baseline gap-3">
          <h2 className="truncate font-sans text-ui font-semibold" style={{ fontStretch: '100%', letterSpacing: 0 }}>
            {title}
          </h2>
          {meta ? <span className="truncate font-mono text-micro text-faint">{meta}</span> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}
