import clsx from 'clsx';
import type { ReactNode } from 'react';

/** Page-width container shared by every marketing section. */
export const CONTAINER = 'mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-12';

interface SectionProps {
  id?: string;
  title: string;
  intro?: string;
  children: ReactNode;
}

/** Hairline-separated section. Heading in columns 1-5, optional intro in 7-12. */
export function Section({ id, title, intro, children }: SectionProps) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-14 border-t border-line py-20 lg:py-28">
      <div className={clsx(CONTAINER, 'flex flex-col gap-10 lg:gap-14')}>
        <div className="grid gap-4 lg:grid-cols-12 lg:gap-8">
          <h2 id={headingId} className="text-balance font-display text-h1 font-semibold lg:col-span-5 lg:text-[40px] lg:leading-[42px]">
            {title}
          </h2>
          {intro ? <p className="max-w-prose text-pretty text-body text-muted lg:col-span-6 lg:col-start-7">{intro}</p> : null}
        </div>
        {children}
      </div>
    </section>
  );
}
