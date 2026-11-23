import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { buttonClass } from './Button';
import { Icon } from './Icon';

/** The workspace top bar. Pinned; assumes the shell's `px-6 py-6 md:px-8` main padding. */
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
    <header className="sticky top-0 z-30 -mx-6 -mt-6 mb-6 flex h-topbar items-center justify-between gap-4 border-b border-line bg-canvas/95 px-6 md:-mx-8 md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        {back ? (
          <Link href={back.href} aria-label={back.label} className={buttonClass('ghost', 'w-8 px-0', 'sm')}>
            <Icon icon={ArrowLeft} />
          </Link>
        ) : null}
        <h1 className="truncate font-display text-title font-semibold">{title}</h1>
        {meta ? <span className="hidden truncate font-mono text-meta text-faint sm:inline">{meta}</span> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
