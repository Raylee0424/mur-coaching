import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Role } from '@coaching/shared';
import { AppShell } from '@/components/shell/AppShell';
import { requireUser } from '@/lib/auth';
import { COACH_NAV, onboardingFor } from '@/lib/routes';

export default async function CoachLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(Role.COACH);
  if (!user.onboardedAt) redirect(onboardingFor(user.role));
  return (
    <AppShell user={user} nav={COACH_NAV}>
      {children}
    </AppShell>
  );
}
