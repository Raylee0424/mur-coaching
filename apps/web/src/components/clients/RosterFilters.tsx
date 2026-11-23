'use client';

import { useCallback } from 'react';
import type { RosterSummaryDto } from '@coaching/shared';
import { SearchField } from '@/components/ui/SearchField';
import { Segmented } from '@/components/ui/Segmented';
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

/** Filter segments are links (server re-fetches); the search box updates `?q=` after a short pause. */
export function RosterFilters({ counts, filter, q }: { counts: RosterSummaryDto['counts']; filter: RosterFilter; q: string }) {
  const hrefFor = useCallback((text: string) => rosterHref(filter, text), [filter]);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Segmented
        label="Roster views"
        items={rosterChips(counts).map((c) => ({ href: rosterHref(c.filter, q), label: c.label, count: c.count, current: c.filter === filter }))}
      />
      <SearchField value={q} label="Search clients" placeholder="Search clients or programs" hrefFor={hrefFor} />
    </div>
  );
}
