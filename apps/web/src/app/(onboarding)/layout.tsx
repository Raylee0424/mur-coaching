import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { Wordmark } from '@/components/shell/Wordmark';
import { getCurrentUser } from '@/lib/auth';

/** No app shell: onboarding is a focused, full-screen flow. Auth is enforced by middleware and getCurrentUser. */
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user.emailVerified) redirect('/verify');
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="flex h-topbar items-center border-b border-line px-4 sm:px-6">
        <Wordmark />
      </header>
      <main className="mx-auto max-w-2xl px-4 py-10">{children}</main>
    </div>
  );
}
