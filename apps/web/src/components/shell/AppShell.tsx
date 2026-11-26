import type { ReactNode } from 'react';
import type { AuthUser } from '@coaching/shared';
import { groupNav, type NavItem } from '@/lib/routes';
import { ToastProvider } from '@/components/ui/Toast';
import { AccountMenu } from './AccountMenu';
import { DemoPill } from './DemoPill';
import { MobileNav } from './MobileNav';
import { NavLink } from './NavLink';
import { OfflineBanner } from './OfflineBanner';
import { Wordmark } from './Wordmark';

export function AppShell({
  user,
  nav,
  tabs,
  badges,
  children,
}: {
  user: AuthUser;
  nav: readonly NavItem[];
  /** Hrefs from `nav` shown as phone tabs; the rest sit in the "More" sheet. */
  tabs: readonly string[];
  /** Live counts keyed by nav href. */
  badges?: Partial<Record<string, number>>;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <OfflineBanner />
      <div className="flex min-w-0 flex-1 flex-col md:flex-row">
        {/* Phones: one brand bar (wordmark, demo pill, account). Desktop: full sidebar with grouped nav. */}
        <aside className="flex min-w-0 max-w-full flex-col justify-between border-b border-line bg-canvas-low md:sticky md:top-0 md:h-dvh md:w-sidebar md:shrink-0 md:border-b-0 md:border-r md:p-4">
          <div className="flex min-w-0 flex-col md:min-h-0 md:flex-1 md:gap-5">
            <div className="flex h-topbar shrink-0 items-center justify-between gap-3 px-4 md:h-auto md:flex-col md:items-start md:px-2 md:py-1">
              <Wordmark />
              <div className="flex min-w-0 items-center gap-2">
                {user.isDemo ? <DemoPill role={user.role} /> : null}
                <div className="md:hidden">
                  <AccountMenu user={user} />
                </div>
              </div>
            </div>
            <nav aria-label="Main" className="hidden md:flex md:min-h-0 md:flex-1 md:flex-col md:gap-4 md:overflow-y-auto">
              {groupNav(nav).map(({ group, items }) => (
                <section key={group} aria-label={group} className="flex flex-col gap-0.5">
                  <h2 className="px-3 pb-1 font-mono text-label-sm uppercase text-faint">{group}</h2>
                  {items.map((item) => (
                    <NavLink key={item.href} item={item} count={badges?.[item.href]} />
                  ))}
                </section>
              ))}
            </nav>
          </div>
          <div className="hidden pt-3 md:block">
            <AccountMenu user={user} />
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-6 pb-24 pt-6 md:px-8 md:pb-6">
          <ToastProvider>{children}</ToastProvider>
        </main>
      </div>
      <MobileNav nav={nav} tabs={tabs} badges={badges} />
    </div>
  );
}
