import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { buttonClass } from './Button';
import { Icon } from './Icon';

/** Stitch 64px workspace top bar. Pinned; assumes the shell's `px-6 py-6 md:px-8` main padding. */
export function PageHeader({
  title,
  meta,
  actions,
  back,
}: {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="sticky top-0 z-30 -mx-6 -mt-6 mb-6 flex min-h-topbar items-center justify-between gap-4 border-b border-line bg-canvas/95 px-6 py-2 backdrop-blur-sm md:-mx-8 md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        {back ? (
          // 44px target (WCAG 2.5.5) with a visible outline so it reads as a button, not a stray glyph.
          <Link href={back.href} aria-label={back.label} title={back.label} className={buttonClass('secondary', 'w-11 shrink-0 px-0', 'lg')}>
            <Icon icon={ArrowLeft} size={20} />
          </Link>
        ) : null}
        <h1 className="min-w-0 text-balance break-words font-display text-title-lg text-ink">{title}</h1>
        {meta ? <span className="hidden truncate font-sans text-label-md text-muted sm:inline">{meta}</span> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </header>
  );
}
