import { CoachClientStatus } from '@coaching/shared';
import type { AttentionReason, RosterQuery } from '@coaching/shared';

export type RosterFilter = 'all' | 'attention' | 'paused' | 'archived';

export const ROSTER_FILTERS: readonly RosterFilter[] = ['all', 'attention', 'paused', 'archived'];

export function parseRosterFilter(value: string | undefined): RosterFilter {
  return (ROSTER_FILTERS as readonly string[]).includes(value ?? '') ? (value as RosterFilter) : 'all';
}

/** Maps a filter chip + search text to the API query. `all` omits status, so the API hides archived clients. */
export function rosterQuery(filter: RosterFilter, q: string): RosterQuery {
  const text = q.trim();
  return {
    ...(filter === 'attention' ? { needsAttention: true } : {}),
    ...(filter === 'paused' ? { status: CoachClientStatus.PAUSED } : {}),
    ...(filter === 'archived' ? { status: CoachClientStatus.ARCHIVED } : {}),
    ...(text ? { q: text } : {}),
  };
}

/** Builds `/coach/clients?...` keeping only non-default params. */
export function rosterHref(filter: RosterFilter, q: string): string {
  const params = new URLSearchParams();
  if (filter !== 'all') params.set('filter', filter);
  if (q.trim()) params.set('q', q.trim());
  const s = params.toString();
  return s ? `/coach/clients?${s}` : '/coach/clients';
}

export type RosterColumn = 'lastSession' | 'program' | 'adherence' | 'pending' | 'rpe';

export const ROSTER_COLUMNS: readonly { key: RosterColumn; label: string }[] = [
  { key: 'lastSession', label: 'Last session' },
  { key: 'program', label: 'Program' },
  { key: 'adherence', label: 'Adherence' },
  { key: 'pending', label: 'Pending' },
  { key: 'rpe', label: 'RPE trend' },
];

export const DEFAULT_COLUMNS: readonly RosterColumn[] = ROSTER_COLUMNS.map((c) => c.key);

/** Parses a stored column list; unknown keys are dropped and invalid input falls back to all columns. */
export function parseColumns(raw: string | null): RosterColumn[] {
  if (!raw) return [...DEFAULT_COLUMNS];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_COLUMNS];
    return DEFAULT_COLUMNS.filter((c) => parsed.includes(c));
  } catch {
    return [...DEFAULT_COLUMNS];
  }
}

export const ATTENTION_LABELS: Record<AttentionReason, string> = {
  PENDING_DELOAD: 'Deload pending',
  LOW_ADHERENCE: 'Low adherence',
  NO_RECENT_SESSION: 'No recent session',
};

/** RPE trend between the last two weeks; null when either side is missing. */
export function rpeTrend(now: number | null, prev: number | null): { delta: number; dir: 'up' | 'down' | 'flat' } | null {
  if (now === null || prev === null) return null;
  const delta = Math.round((now - prev) * 10) / 10;
  return { delta, dir: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat' };
}
