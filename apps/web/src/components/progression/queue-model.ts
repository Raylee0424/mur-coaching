import { RecommendationAction } from '@coaching/shared';
import type { BulkResolveResponse, RecommendationQueueItem, ResolvableStatus } from '@coaching/shared';

export type ActionFilter = RecommendationAction | 'ALL';

/** Chip order: the most urgent call first after "All". */
export const ACTION_FILTERS: readonly RecommendationAction[] = [
  RecommendationAction.INCREASE_LOAD,
  RecommendationAction.INCREASE_REPS,
  RecommendationAction.HOLD,
  RecommendationAction.DELOAD,
];

export function parseActionFilter(value: string | undefined): ActionFilter {
  return (ACTION_FILTERS as readonly string[]).includes(value ?? '') ? (value as RecommendationAction) : 'ALL';
}

export function queueHref(action: ActionFilter, q: string): string {
  const params = new URLSearchParams();
  if (action !== 'ALL') params.set('action', action);
  if (q.trim()) params.set('q', q.trim());
  const s = params.toString();
  return s ? `/coach/progression?${s}` : '/coach/progression';
}

export function toggleId(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export type SelectionState = 'none' | 'some' | 'all';

export function selectionState(items: readonly RecommendationQueueItem[], selected: ReadonlySet<string>): SelectionState {
  const n = items.filter((i) => selected.has(i.id)).length;
  return n === 0 ? 'none' : n === items.length ? 'all' : 'some';
}

/** Header checkbox: everything visible when nothing or some rows are selected, nothing when all are. */
export function toggleAll(items: readonly RecommendationQueueItem[], selected: ReadonlySet<string>): Set<string> {
  return selectionState(items, selected) === 'all' ? new Set() : new Set(items.map((i) => i.id));
}

/** Drops ids that are no longer in the list (resolved elsewhere, filtered out). */
export function pruneSelection(items: readonly RecommendationQueueItem[], selected: ReadonlySet<string>): Set<string> {
  const ids = new Set(items.map((i) => i.id));
  return new Set([...selected].filter((id) => ids.has(id)));
}

export function bulkMessage(status: ResolvableStatus, r: Pick<BulkResolveResponse, 'updated' | 'skipped'>): string {
  const verb = status === 'ACCEPTED' ? 'Accepted' : 'Dismissed';
  const base = `${verb} ${r.updated} ${r.updated === 1 ? 'recommendation' : 'recommendations'}.`;
  return r.skipped > 0 ? `${base} ${r.skipped} already resolved or replaced.` : base;
}
