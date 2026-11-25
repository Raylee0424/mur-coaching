'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isNavActive, type NavItem } from '@/lib/routes';
import { Icon } from '@/components/ui/Icon';
import { NAV_ICONS } from './nav-icons';

export function NavLink({ item, count, onNavigate }: { item: NavItem; count?: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isNavActive(item, pathname);
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={clsx(
        'group flex items-center gap-3 whitespace-nowrap rounded-sm border px-3 py-2 font-sans text-label-lg transition-colors',
        active
          ? 'border-line bg-raised text-ink'
          : 'border-transparent text-muted hover:bg-card hover:text-ink',
      )}
    >
      <span className={active ? 'text-primary' : 'text-muted group-hover:text-ink'}>
        <Icon icon={NAV_ICONS[item.icon]} />
      </span>
      <span className="truncate">{item.label}</span>
      {count ? (
        <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 font-sans text-label-sm text-primary-ink tabular-nums">
          {count}
          <span className="sr-only"> pending</span>
        </span>
      ) : null}
    </Link>
  );
}
