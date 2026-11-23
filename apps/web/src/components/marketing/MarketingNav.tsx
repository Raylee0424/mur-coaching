import clsx from 'clsx';
import Link from 'next/link';
import { Wordmark } from '@/components/shell/Wordmark';
import { buttonClass } from '@/components/ui/Button';
import { DemoForms } from './DemoForms';
import { CONTAINER } from './Section';

const ANCHORS = [
  { href: '#engine', label: 'Engine' },
  { href: '#loop', label: 'How it works' },
  { href: '#coaches', label: 'Coaches' },
  { href: '#athletes', label: 'Athletes' },
] as const;

const LINK = 'text-ui text-muted transition-colors hover:text-ink';

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 h-14 border-b border-line bg-canvas/95">
      <div className={clsx(CONTAINER, 'flex h-full items-center justify-between gap-4')}>
        <a href="#top" aria-label="MUR Coaching home">
          <Wordmark />
        </a>

        <nav aria-label="Page sections" className="hidden items-center gap-8 lg:flex">
          {ANCHORS.map((a) => (
            <a key={a.href} href={a.href} className={LINK}>
              {a.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <Link href="/login" className={LINK}>
            Sign in
          </Link>
          <details className="group relative">
            <summary className={buttonClass('primary', 'cursor-pointer list-none [&::-webkit-details-marker]:hidden', 'sm')}>
              Try the demo
            </summary>
            <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-md border border-line bg-raised p-3">
              <DemoForms layout="stacked" />
              <p className="mt-3 text-meta text-muted">Seeded accounts. No signup.</p>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
