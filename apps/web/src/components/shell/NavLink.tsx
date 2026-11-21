'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from '@/lib/routes';

export function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'flex min-h-11 items-center justify-between gap-2 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
        active ? "bg-primary text-primary-ink" : "text-muted hover:bg-raised hover:text-ink",
      )}
    >
      {item.label}
      {item.soon ? (
        <span className={clsx('rounded px-1.5 text-xs', active ? 'bg-primary-ink/20' : 'bg-raised text-muted')}>
          Soon
        </span>
      ) : null}
    </Link>
  );
}
