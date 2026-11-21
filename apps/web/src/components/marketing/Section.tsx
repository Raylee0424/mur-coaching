import clsx from 'clsx';
import type { ReactNode } from 'react';

/** Page-width container shared by every marketing section. */
export const CONTAINER = 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-16';

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={clsx('text-[11px] font-semibold uppercase leading-4 tracking-wider text-primary', className)}>
      {children}
    </span>
  );
}

interface SectionProps {
  id?: string;
  eyebrow?: string;
  title?: string;
  intro?: string;
  children: ReactNode;
}

/** Bordered page section with an optional eyebrow / heading / intro block. */
export function Section({ id, eyebrow, title, intro, children }: SectionProps) {
  const headingId = id && title ? `${id}-heading` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-20 border-b border-line py-16 lg:py-24">
      <div className={clsx(CONTAINER, 'flex flex-col gap-10 lg:gap-12')}>
        {title ? (
          <div className="flex max-w-2xl flex-col gap-3">
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            <h2 id={headingId} className="text-balance text-[28px] font-bold leading-tight lg:text-[40px]">
              {title}
            </h2>
            {intro ? <p className="text-pretty text-lg text-muted">{intro}</p> : null}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}
