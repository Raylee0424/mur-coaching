import type { ReactNode } from 'react';
import { Role } from '@coaching/shared';
import { AppShell } from '@/components/shell/AppShell';
import { requireUser } from '@/lib/auth';
import { COACH_NAV } from '@/lib/routes';

export default async function CoachLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(Role.COACH);
  return (
    <AppShell user={user} nav={COACH_NAV}>
      {children}
    </AppShell>
  );
}
