import clsx from 'clsx';
import Link from 'next/link';
import { Wordmark } from '@/components/shell/Wordmark';
import { CONTAINER } from './Section';

const LINK = 'text-meta text-muted transition-colors hover:text-ink';

export function MarketingFooter() {
  return (
    <footer className="border-t border-line">
      <div className={clsx(CONTAINER, 'flex h-14 items-center justify-between gap-4')}>
        <div className="flex items-baseline gap-3">
          <Wordmark />
          <span className="font-mono text-micro text-faint">© 2026</span>
        </div>
        <nav aria-label="Footer" className="flex items-center gap-6">
          <a href="#loop" className={LINK}>
            How it works
          </a>
          <a href="#demo" className={LINK}>
            Demo
          </a>
          <Link href="/login" className={LINK}>
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
