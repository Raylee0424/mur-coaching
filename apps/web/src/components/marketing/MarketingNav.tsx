import clsx from 'clsx';
import Link from 'next/link';
import { Wordmark } from '@/components/shell/Wordmark';
import { buttonClass } from '@/components/ui/Button';
import { DemoForms } from './DemoForms';
import { CONTAINER } from './Section';

const ANCHORS = [
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#progression-engine', label: 'Progression Engine' },
  { href: '#for-coaches', label: 'For Coaches' },
  { href: '#for-clients', label: 'For Clients' },
  { href: '#pricing', label: 'Pricing' },
] as const;

const LINK = 'font-sans text-label-lg text-muted transition-colors hover:text-ink';

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/95 backdrop-blur-sm">
      <div className={clsx(CONTAINER, 'flex h-20 items-center justify-between gap-4 sm:gap-8')}>
        <a href="#top" aria-label="MUR Coaching home" className="shrink-0">
          <Wordmark />
        </a>

        <nav aria-label="Primary Navigation" className="hidden items-center gap-8 lg:flex">
          {ANCHORS.map((a) => (
            <a key={a.href} href={a.href} className={LINK}>
              {a.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3 sm:gap-5">
          <Link href="/login" className={LINK}>
            Sign In
          </Link>
          <details className="group relative">
            <summary className={buttonClass('primary', 'cursor-pointer list-none sm:px-6 [&::-webkit-details-marker]:hidden', 'lg')}>
              Try Live Demo
            </summary>
            <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-md border border-line bg-card p-3.5">
              <DemoForms layout="stacked" />
              <p className="mt-3 text-meta text-muted">Seeded accounts. No signup required.</p>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
