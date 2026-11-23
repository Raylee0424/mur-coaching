'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from '@/lib/routes';
import { Icon } from '@/components/ui/Icon';
import { NAV_ICONS } from './nav-icons';

export function NavLink({ item, count }: { item: NavItem; count?: number }) {
  const pathname = usePathname();
  const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'group relative flex h-9 items-center gap-2.5 whitespace-nowrap rounded px-2.5 text-ui font-medium transition-colors',
        active ? 'bg-raised text-ink' : 'text-muted hover:bg-raised/60 hover:text-ink',
      )}
    >
      {active ? <span aria-hidden="true" className="absolute inset-y-2 -left-3 hidden w-0.5 rounded-full bg-signal md:block" /> : null}
      <span className={active ? 'text-ink' : 'text-faint group-hover:text-ink'}>
        <Icon icon={NAV_ICONS[item.icon]} />
      </span>
      {item.label}
      {count ? (
        <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-signal-bg px-1 font-mono text-micro text-signal">
          {count}
          <span className="sr-only"> pending</span>
        </span>
      ) : null}
    </Link>
  );
}
