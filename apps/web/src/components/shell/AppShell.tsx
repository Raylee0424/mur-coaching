import type { ReactNode } from 'react';
import type { AuthUser } from '@coaching/shared';
import type { NavItem } from '@/lib/routes';
import { ToastProvider } from '@/components/ui/Toast';
import { AccountMenu } from './AccountMenu';
import { DemoBanner } from './DemoBanner';
import { NavLink } from './NavLink';
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
    <div className="flex min-h-screen flex-col">
      {user.isDemo ? <DemoBanner role={user.role} /> : null}
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="flex flex-col border-b border-line bg-canvas-low md:sticky md:top-0 md:h-dvh md:w-sidebar md:shrink-0 md:border-b-0 md:border-r">
          <div className="flex h-topbar shrink-0 items-center justify-between gap-3 px-4 md:px-5">
            <Wordmark />
            <div className="md:hidden">
              <AccountMenu user={user} />
            </div>
          </div>
          <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-4 pb-3 md:flex-1 md:flex-col md:overflow-visible md:px-5 md:pb-0">
            {nav.map((item) => (
              <NavLink key={item.href} item={item} count={badges?.[item.href]} />
            ))}
          </nav>
          <div className="hidden border-t border-line p-2 md:block">
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
