import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Role } from '@coaching/shared';
import { AppShell } from '@/components/shell/AppShell';
import { getCurrentUser } from '@/lib/auth';
import { CLIENT_NAV, CLIENT_TABS, COACH_NAV, COACH_TABS, navFor, onboardingFor } from '@/lib/routes';

export default async function ModerationLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user.onboardedAt) redirect(onboardingFor(user.role));
  const coach = user.role === Role.COACH;
  return (
    <AppShell user={user} nav={navFor(coach ? COACH_NAV : CLIENT_NAV, user)} tabs={coach ? COACH_TABS : CLIENT_TABS}>
      {children}
    </AppShell>
  );
}
