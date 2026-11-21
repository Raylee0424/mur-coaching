import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Role } from '@coaching/shared';
import { AppShell } from '@/components/shell/AppShell';
import { requireUser } from '@/lib/auth';
import { CLIENT_NAV, onboardingFor } from '@/lib/routes';
import { TabBar } from './client/_components/TabBar';

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(Role.CLIENT);
  if (!user.onboardedAt) redirect(onboardingFor(user.role));
  return (
    // On phones the bottom tab bar replaces the shell's top nav strip; desktop keeps the sidebar.
    <div className="max-md:[&_nav[aria-label=Main]]:hidden">
      <AppShell user={user} nav={CLIENT_NAV}>
        <div className="pb-20 md:pb-0">{children}</div>
      </AppShell>
      <TabBar items={CLIENT_NAV} />
    </div>
  );
}
