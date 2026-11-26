import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Role } from '@coaching/shared';
import { AppShell } from '@/components/shell/AppShell';
import { requireUser } from '@/lib/auth';
import { CLIENT_NAV, CLIENT_TABS, navFor, onboardingFor } from '@/lib/routes';

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(Role.CLIENT);
  if (!user.onboardedAt) redirect(onboardingFor(user.role));
  return (
    <AppShell user={user} nav={navFor(CLIENT_NAV, user)} tabs={CLIENT_TABS}>
      {children}
    </AppShell>
  );
}
