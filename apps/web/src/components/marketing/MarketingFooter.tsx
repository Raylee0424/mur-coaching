import clsx from 'clsx';
import Link from 'next/link';
import { Logo } from './MarketingNav';
import { CONTAINER } from './Section';

const LINK = 'text-xs font-semibold text-muted transition-colors hover:text-ink';

export function MarketingFooter() {
  return (
    <footer>
      <div className={clsx(CONTAINER, 'flex flex-col items-center justify-between gap-4 py-8 sm:flex-row')}>
        <div className="flex items-center gap-3">
          <Logo />
          <span className="font-display font-semibold">MUR Coaching</span>
          <span className="tabular text-[11px] font-semibold text-muted">© 2026</span>
        </div>
        <nav aria-label="Footer" className="flex items-center gap-6">
          <a href="#how-it-works" className={LINK}>
            How It Works
          </a>
          <a href="#demo" className={LINK}>
            Live Demo
          </a>
          <Link href="/login" className={LINK}>
            Sign In
          </Link>
        </nav>
      </div>
    </footer>
  );
}
