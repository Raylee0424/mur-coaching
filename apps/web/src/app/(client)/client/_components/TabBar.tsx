'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from '@/lib/routes';

const ICONS: Record<string, string> = {
  '/client': 'M7 2v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-2V2h-2v2H9V2H7zm-2 8h14v10H5V10z',
  '/client/history': 'M13 3a9 9 0 00-9 9H1l4 4 4-4H6a7 7 0 117 7 7 7 0 01-4.9-2l-1.4 1.4A9 9 0 1013 3zm-1 5v5l4.3 2.5.8-1.3-3.6-2.2V8H12z',
  '/client/profile': 'M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4 0-8 2-8 5v3h16v-3c0-3-4-5-8-5z',
};

/** Paths that light a tab besides its own prefix (lift detail belongs to History). */
function isActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  if (item.href === '/client/history' && pathname.startsWith('/client/lifts/')) return true;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Bottom tab bar for phones; desktop keeps the shell's sidebar nav. */
export function TabBar({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Client navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-3 items-center border-t border-line bg-canvas-low px-4 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {items.map((item) => {
        const active = isActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-md text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
              active ? 'text-primary' : 'text-muted hover:text-ink',
            )}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
              <path d={ICONS[item.href] ?? ICONS['/client']} />
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
