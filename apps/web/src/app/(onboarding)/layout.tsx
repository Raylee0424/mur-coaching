import type { ReactNode } from 'react';
import { getCurrentUser } from '@/lib/auth';

/** No app shell: onboarding is a focused, full-screen flow. Auth is enforced by middleware and getCurrentUser. */
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  await getCurrentUser();
  return (
    <div className="min-h-dvh bg-canvas px-4 py-8 md:py-14">
      <p className="mx-auto mb-8 flex max-w-lg items-center gap-2 font-display text-lg font-extrabold tracking-tight">
        <span aria-hidden="true" className="size-2.5 rounded-full bg-primary" />
        Ray Coaching
      </p>
      <main>{children}</main>
    </div>
  );
}
