import type { ReactNode } from 'react';
import type { AuthUser } from '@coaching/shared';
import type { NavItem } from '@/lib/routes';
import { DemoBanner } from './DemoBanner';
import { NavLink } from './NavLink';
import { UserMenu } from './UserMenu';

export function AppShell({ user, nav, children }: { user: AuthUser; nav: readonly NavItem[]; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {user.isDemo ? <DemoBanner role={user.role} /> : null}
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="border-b border-line bg-canvas-low md:w-60 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:flex-col md:items-stretch md:gap-4 md:py-5">
            <span className="flex items-center gap-2 whitespace-nowrap font-display text-lg font-extrabold tracking-tight"><span aria-hidden="true" className="size-2.5 rounded-full bg-primary" />MUR Coaching</span>
            <div className="md:order-last md:border-t md:border-line md:pt-4">
              <UserMenu user={user} />
            </div>
          </div>
          <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3 md:pb-0">
            {nav.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
