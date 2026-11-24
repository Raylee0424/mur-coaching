import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { Role } from '@coaching/shared';
import { Wordmark } from '@/components/shell/Wordmark';
import { getCurrentUser } from '@/lib/auth';
import { homeFor } from '@/lib/routes';

/** Focused Stitch onboarding frame: 64px top bar with Wordmark + role setup badge, centered workspace below. */
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user.emailVerified) redirect('/verify');
  const label = user.role === Role.COACH ? 'COACH WORKSPACE SETUP' : 'ATHLETE SETUP';
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex h-topbar items-center justify-between gap-4 border-b border-line bg-canvas px-6 lg:px-8">
        <Link href={user.onboardedAt ? homeFor(user.role) : '/'} className="inline-flex rounded-sm">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-line bg-card px-3 py-1 font-mono text-label-sm uppercase text-muted">
            {label}
          </span>
          {user.onboardedAt ? (
            <Link href={homeFor(user.role)} className="font-sans text-label-md text-muted hover:text-ink">
              Exit setup
            </Link>
          ) : null}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 lg:px-8">{children}</main>
    </div>
  );
}
