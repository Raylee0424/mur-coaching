import { SearchX } from 'lucide-react';
import Link from 'next/link';
import { Wordmark } from '@/components/shell/Wordmark';
import { buttonClass } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex h-topbar items-center justify-between gap-4 border-b border-line bg-canvas px-6 lg:px-8">
        <Link href="/" className="inline-flex rounded-sm">
          <Wordmark />
        </Link>
        <span className="rounded-full border border-line bg-card px-3 py-1 font-mono text-label-sm uppercase text-muted">
          HTTP 404
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <article className="flex flex-col justify-between gap-6 rounded-md border border-line bg-card p-7">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex size-11 items-center justify-center rounded-sm border border-line bg-canvas-low text-primary">
                <Icon icon={SearchX} size={20} />
              </span>
              <span className="rounded-full border border-line bg-raised px-3 py-0.5 font-mono text-label-sm text-muted">
                HTTP 404
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <h1 className="font-display text-title-lg text-ink">404 — Lift or Page Not Found</h1>
              <p className="text-pretty font-sans text-body-md text-muted">
                This movement record, session log, or route does not exist or was archived by your coach.
              </p>
            </div>

            <div className="rounded-sm border border-line bg-canvas-low p-3.5 font-mono text-label-sm text-muted">
              status: 404_NOT_FOUND
            </div>
          </div>

          <Link href="/" className={buttonClass('primary', 'w-full justify-center', 'lg')}>
            Back to Dashboard
          </Link>
        </article>
      </main>
    </div>
  );
}
