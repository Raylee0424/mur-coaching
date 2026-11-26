'use client';

import clsx from 'clsx';
import { Ellipsis } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { groupNav, isNavActive, type NavItem } from '@/lib/routes';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { NavLink } from './NavLink';
import { NAV_ICONS } from './nav-icons';

const TAB = 'relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-sm font-sans text-label-sm transition-colors';

function Dot({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span className="absolute right-1/2 top-1 translate-x-4 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-micro font-semibold text-primary-ink tabular-nums">
      {count}
      <span className="sr-only"> pending</span>
    </span>
  );
}

/** Phone navigation: four tabs plus a "More" sheet with every nav group. Desktop uses the sidebar. */
export function MobileNav({
  nav,
  tabs,
  badges,
}: {
  nav: readonly NavItem[];
  /** Hrefs from `nav`, in tab order. */
  tabs: readonly string[];
  badges?: Partial<Record<string, number>>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const tabItems = tabs.flatMap((href) => nav.filter((i) => i.href === href));
  const onTab = tabItems.some((i) => isNavActive(i, pathname));
  const moreCount = nav.filter((i) => !tabs.includes(i.href)).reduce((sum, i) => sum + (badges?.[i.href] ?? 0), 0);

  // Close the sheet once a link inside it has navigated.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 items-center border-t border-line bg-canvas-low/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
      >
        {tabItems.map((item) => {
          const active = isNavActive(item, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={clsx(TAB, active ? 'text-primary' : 'text-muted hover:text-ink')}
            >
              {active ? <span aria-hidden="true" className="absolute inset-x-5 -top-px h-0.5 rounded-full bg-primary" /> : null}
              <Icon icon={NAV_ICONS[item.icon]} size={20} />
              <span className="max-w-full truncate">{item.short ?? item.label}</span>
              <Dot count={badges?.[item.href]} />
            </Link>
          );
        })}
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className={clsx(TAB, !onTab ? 'text-primary' : 'text-muted hover:text-ink')}
        >
          {!onTab ? <span aria-hidden="true" className="absolute inset-x-5 -top-px h-0.5 rounded-full bg-primary" /> : null}
          <Icon icon={Ellipsis} size={20} />
          More
          <Dot count={moreCount} />
        </button>
      </nav>

      <Sheet open={open} onClose={() => setOpen(false)} title="All pages" variant="bottom">
        <nav aria-label="All pages" className="flex flex-col gap-5">
          {groupNav(nav).map(({ group, items }) => (
            <section key={group} aria-label={group} className="flex flex-col gap-1">
              <h3 className="px-3 font-mono text-label-sm uppercase text-faint">{group}</h3>
              {items.map((item) => (
                <NavLink key={item.href} item={item} count={badges?.[item.href]} onNavigate={() => setOpen(false)} />
              ))}
            </section>
          ))}
        </nav>
      </Sheet>
    </>
  );
}
