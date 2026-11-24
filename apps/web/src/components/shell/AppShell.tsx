import type { ReactNode } from 'react';
import type { AuthUser } from '@coaching/shared';
import type { NavItem } from '@/lib/routes';
import { ToastProvider } from '@/components/ui/Toast';
import { AccountMenu } from './AccountMenu';
import { DemoBanner } from './DemoBanner';
import { NavLink } from './NavLink';
import { OfflineBanner } from './OfflineBanner';
import { Wordmark } from './Wordmark';

export function AppShell({
  user,
  nav,
  badges,
  children,
}: {
  user: AuthUser;
  nav: readonly NavItem[];
  /** Live counts keyed by nav href. */
  badges?: Partial<Record<string, number>>;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <OfflineBanner />
      {user.isDemo ? <DemoBanner role={user.role} /> : null}
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="flex flex-col justify-between border-b border-line bg-canvas-low md:sticky md:top-0 md:h-dvh md:w-sidebar md:shrink-0 md:border-b-0 md:border-r md:p-4">
          <div className="flex flex-col md:min-h-0 md:flex-1 md:gap-5">
            <div className="flex h-topbar shrink-0 items-center justify-between gap-3 px-4 md:h-auto md:px-2 md:py-1">
              <Wordmark />
              <div className="md:hidden">
                <AccountMenu user={user} />
              </div>
            </div>
            <nav
              aria-label="Main"
              className="flex gap-1 overflow-x-auto px-4 pb-3 md:min-h-0 md:flex-1 md:flex-col md:overflow-y-auto md:px-0 md:pb-0"
            >
              {nav.map((item) => (
                <NavLink key={item.href} item={item} count={badges?.[item.href]} />
              ))}
            </nav>
          </div>
          <div className="hidden pt-3 md:block">
            <AccountMenu user={user} />
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-6 py-6 md:px-8">
          <ToastProvider>{children}</ToastProvider>
        </main>
      </div>
    </div>
  );
}
