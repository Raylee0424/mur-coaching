import type { ReactNode } from 'react';
import { Role } from '@coaching/shared';
import { AppShell } from '@/components/shell/AppShell';
import { requireUser } from '@/lib/auth';
import { CLIENT_NAV } from '@/lib/routes';

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(Role.CLIENT);
  return (
    <AppShell user={user} nav={CLIENT_NAV}>
      {children}
    </AppShell>
  );
}
