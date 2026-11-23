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

/** Link-based filter group (server re-fetches on navigation). */
export function Segmented({ items, label }: { items: SegmentedItem[]; label: string }) {
  return (
    <nav aria-label={label} className="inline-flex h-9 items-center gap-0.5 rounded border border-line bg-canvas-low p-0.5">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={i.current ? 'page' : undefined}
          className={clsx(
            'inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-sm px-2.5 text-ui transition-colors',
            i.current ? 'bg-raised text-ink' : 'text-muted hover:text-ink',
          )}
        >
          {i.icon ? <Icon icon={i.icon} size={14} /> : null}
          {i.label}
          {i.count !== undefined ? <span className="font-mono text-micro text-faint">{i.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
