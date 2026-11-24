import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Icon } from './Icon';

export interface SegmentedItem {
  href: string;
  label: string;
  count?: number;
  current: boolean;
  icon?: LucideIcon;
}

/** Stitch pill tab filter group (server re-fetches on navigation). */
export function Segmented({ items, label }: { items: SegmentedItem[]; label: string }) {
  return (
    <nav aria-label={label} className="inline-flex items-center gap-1 rounded-full border border-line bg-card p-1">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={i.current ? 'page' : undefined}
          className={clsx(
            'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 font-sans text-label-md transition-colors',
            i.current ? 'bg-raised text-ink' : 'text-muted hover:text-ink',
          )}
        >
          {i.icon ? <Icon icon={i.icon} size={14} /> : null}
          {i.label}
          {i.count !== undefined ? <span className="tabular-nums opacity-80">({i.count})</span> : null}
        </Link>
      ))}
    </nav>
  );
}
