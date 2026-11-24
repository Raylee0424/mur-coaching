'use client';

import { AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';
import { Wordmark } from '@/components/shell/Wordmark';
import { Button, buttonClass } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  const msg = error.message || 'An unexpected error occurred.';
  const isSessionExpired = /401|session|unauthori[sz]ed|expired/i.test(msg);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex h-topbar items-center justify-between gap-4 border-b border-line bg-canvas px-6 lg:px-8">
        <Link href="/" className="inline-flex rounded-sm">
          <Wordmark />
        </Link>
        <span className="rounded-full border border-line bg-card px-3 py-1 font-mono text-label-sm uppercase text-muted">
          SYSTEM RECOVERY
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        {isSessionExpired ? (
          <article className="flex flex-col justify-between gap-6 rounded-md border border-line bg-card p-7">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex size-11 items-center justify-center rounded-sm border border-amber/40 bg-amber-bg text-amber">
                  <Icon icon={Clock} size={20} />
                </span>
                <span className="rounded-full border border-amber/40 bg-amber-bg px-3 py-0.5 font-mono text-label-sm text-amber">
                  401 TIMEOUT
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <h1 className="font-display text-title-lg text-ink">Session Expired</h1>
                <p role="alert" className="text-pretty font-sans text-body-md text-muted">
                  Your httpOnly authentication session timed out after inactivity. Unsaved workout sets remain cached locally.
                </p>
              </div>

              <div className="flex items-center justify-between rounded-sm border border-line bg-canvas-low p-3.5 font-mono text-label-sm">
                <span className="text-muted">Local Drafts</span>
                <span className="text-emerald">Preserved</span>
              </div>
            </div>

            <Link href="/login?reason=expired" className={buttonClass('primary', 'w-full justify-center', 'lg')}>
              Sign In Again
            </Link>
          </article>
        ) : (
          <article className="flex flex-col justify-between gap-6 rounded-md border border-line bg-card p-7">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex size-11 items-center justify-center rounded-sm border border-rose/40 bg-rose-bg text-rose">
                  <Icon icon={AlertTriangle} size={20} />
                </span>
                <span className="rounded-full border border-rose/40 bg-rose-bg px-3 py-0.5 font-mono text-label-sm text-rose">
                  ERROR
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <h1 className="font-display text-title-lg text-ink">Something Went Wrong</h1>
                <p role="alert" className="text-pretty font-sans text-body-md text-muted">
                  {msg}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Button onClick={reset} size="lg" className="flex-1">
                Try Again
              </Button>
              <Link href="/" className={buttonClass('secondary', 'flex-1 justify-center', 'lg')}>
                Back Home
              </Link>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
