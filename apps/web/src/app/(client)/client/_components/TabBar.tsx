'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from '@/lib/routes';
import { Icon } from '@/components/ui/Icon';
import { NAV_ICONS } from '@/components/shell/nav-icons';

/** Paths that light a tab besides its own prefix (lift detail and records belong to History). */
function isActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  if (item.href === '/client/history' && (pathname.startsWith('/client/lifts/') || pathname === '/client/records')) return true;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Bottom tab bar for phones; desktop keeps the shell's sidebar nav. */
export function TabBar({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Client navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 items-center border-t border-line bg-canvas-low px-2 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {items.map((item) => {
        const active = isActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              'relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded text-meta font-medium',
              active ? 'text-ink' : 'text-faint hover:text-ink',
            )}
          >
            {active ? <span aria-hidden="true" className="absolute inset-x-6 -top-px h-0.5 bg-signal" /> : null}
            <Icon icon={NAV_ICONS[item.icon]} size={20} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
