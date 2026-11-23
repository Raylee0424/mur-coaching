'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { RosterSummaryDto } from '@coaching/shared';
import { rosterHref, type RosterFilter } from './roster-model';

interface Chip {
  filter: RosterFilter;
  label: string;
  count: number;
}

export function rosterChips(counts: RosterSummaryDto['counts']): Chip[] {
  const chips: Chip[] = [
    { filter: 'all', label: 'All', count: counts.ACTIVE + counts.PAUSED },
    { filter: 'attention', label: 'Needs attention', count: counts.needsAttention },
    { filter: 'paused', label: 'Paused', count: counts.PAUSED },
  ];
  if (counts.ARCHIVED > 0) chips.push({ filter: 'archived', label: 'Archived', count: counts.ARCHIVED });
  return chips;
}

/** Filter chips are links (server re-fetches); the search box updates `?q=` after a short pause. */
export function RosterFilters({ counts, filter, q }: { counts: RosterSummaryDto['counts']; filter: RosterFilter; q: string }) {
  const router = useRouter();
  const [text, setText] = useState(q);
  const first = useRef(true);

  useEffect(() => setText(q), [q]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (text.trim() === q.trim()) return;
    const t = setTimeout(() => router.replace(rosterHref(filter, text)), 300);
    return () => clearTimeout(t);
  }, [text, q, filter, router]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <nav aria-label="Roster views" className="flex flex-wrap gap-1 rounded-full bg-canvas-low p-1 ring-1 ring-inset ring-line">
        {rosterChips(counts).map((c) => {
          const on = c.filter === filter;
          return (
            <Link
              key={c.filter}
              href={rosterHref(c.filter, text)}
              aria-current={on ? 'page' : undefined}
              className={clsx(
                'inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors',
                on ? 'bg-primary text-primary-ink' : 'text-muted hover:text-ink',
              )}
            >
              {c.label}
              <span className={clsx('tabular-nums', on ? 'text-primary-ink/70' : 'text-muted')}>({c.count})</span>
            </Link>
          );
        })}
      </nav>
      <form role="search" onSubmit={(e) => { e.preventDefault(); router.replace(rosterHref(filter, text)); }} className="min-w-52 flex-1 sm:max-w-xs">
        <label className="relative block">
          <span className="sr-only">Search clients</span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="9" cy="9" r="5.5" />
            <path d="m13.5 13.5 3 3" />
          </svg>
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search clients or programs…"
            className="block min-h-10 w-full rounded-full border border-line bg-canvas-low pl-9 pr-3 text-sm text-ink placeholder:text-muted/60"
          />
        </label>
      </form>
    </div>
  );
}
