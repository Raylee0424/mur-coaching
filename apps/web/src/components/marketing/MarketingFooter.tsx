import clsx from 'clsx';
import Link from 'next/link';
import { Wordmark } from '@/components/shell/Wordmark';
import { CONTAINER } from './Section';

const LINK = 'font-sans text-label-md text-muted transition-colors hover:text-ink';

export function MarketingFooter() {
  return (
    <footer className="border-t border-line">
      <div className={clsx(CONTAINER, 'flex flex-col items-center justify-between gap-4 py-8 sm:flex-row')}>
        <div className="flex items-center gap-3">
          <Wordmark />
          <span className="font-sans text-label-sm text-muted tabular-nums">© 2026</span>
        </div>
        <nav aria-label="Footer" className="flex items-center gap-6">
          <a href="#how-it-works" className={LINK}>
            How It Works
          </a>
          <a href="#pricing" className={LINK}>
            Pricing
          </a>
          <Link href="/login" className={LINK}>
            Sign In
          </Link>
        </nav>
      </div>
    </footer>
  );
}
