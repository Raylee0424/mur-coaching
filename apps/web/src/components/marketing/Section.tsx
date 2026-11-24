import clsx from 'clsx';
import type { ReactNode } from 'react';

/** 1280px centered container with 64px desktop safe padding matching Stitch (`max-w-7xl mx-auto px-6 lg:px-16`). */
export const CONTAINER = 'mx-auto w-full max-w-7xl px-6 lg:px-16';

interface SectionProps {
  id?: string;
  eyebrow?: string;
  title: string;
  intro?: string;
  borderBottom?: boolean;
  children: ReactNode;
}

/** Stitch landing section with tracked lime eyebrow, Plus Jakarta Sans headline, and 96px vertical rhythm. */
export function Section({ id, eyebrow, title, intro, borderBottom = true, children }: SectionProps) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={clsx('scroll-mt-20 py-20 lg:py-24', borderBottom && 'border-b border-line')}
    >
      <div className={clsx(CONTAINER, 'flex flex-col gap-12')}>
        <div className="flex max-w-2xl flex-col gap-3">
          {eyebrow ? (
            <span className="font-sans text-label-sm uppercase tracking-wider text-primary">{eyebrow}</span>
          ) : null}
          <h2 id={headingId} className="text-balance font-display text-headline-lg-mobile lg:text-headline-lg text-ink">
            {title}
          </h2>
          {intro ? <p className="text-pretty font-sans text-body-lg text-muted">{intro}</p> : null}
        </div>
        {children}
      </div>
    </section>
  );
}
