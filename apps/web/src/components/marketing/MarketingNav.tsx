import clsx from 'clsx';
import Link from 'next/link';
import { buttonClass } from '@/components/ui/Button';
import { DemoForms } from './DemoForms';
import { BoltIcon } from './Icons';
import { CONTAINER } from './Section';

const ANCHORS = [
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#progression-engine', label: 'Progression Engine' },
  { href: '#for-coaches', label: 'For Coaches' },
  { href: '#for-clients', label: 'For Clients' },
] as const;

const LINK = 'text-sm font-semibold text-muted transition-colors hover:text-ink';

export function Logo() {
  return (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-primary text-primary-ink">
      <BoltIcon className="size-5" />
    </span>
  );
}

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas">
      <div className={clsx(CONTAINER, 'flex h-16 items-center justify-between gap-4 lg:h-20 lg:gap-8')}>
        <a href="#top" className="inline-flex shrink-0 items-center gap-2.5 rounded-[8px]">
          <Logo />
          <span className="sr-only font-display text-xl font-semibold tracking-tight sm:not-sr-only">Ray Coaching</span>
        </a>

        <nav aria-label="Page sections" className="hidden items-center gap-8 lg:flex">
          {ANCHORS.map((a) => (
            <a key={a.href} href={a.href} className={LINK}>
              {a.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-4 sm:gap-5">
          <Link href="/login" className={LINK}>
            Sign In
          </Link>
          <details className="group relative">
            <summary className={buttonClass('primary', 'list-none px-4 sm:px-6 [&::-webkit-details-marker]:hidden')}>
              Try Live Demo
            </summary>
            <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-card p-4 shadow-2xl shadow-black/50">
              <p className="mb-3 text-sm text-muted">Sign in to a seeded account. No signup needed.</p>
              <DemoForms layout="stacked" />
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
