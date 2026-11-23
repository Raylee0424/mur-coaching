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

/** A resolve that has been shown to the coach but not yet sent to the API (the Undo window). */
export interface ScheduledCommit {
  ids: readonly string[];
  status: ResolvableStatus;
}

export type ScheduledMap = Readonly<Record<string, ScheduledCommit>>;

export function schedule(map: ScheduledMap, token: string, ids: readonly string[], status: ResolvableStatus): ScheduledMap {
  return { ...map, [token]: { ids, status } };
}

/** Removes a scheduled commit; `cancelled` is what was dropped (undefined if the token was unknown). */
export function cancel(map: ScheduledMap, token: string): { next: ScheduledMap; cancelled: ScheduledCommit | undefined } {
  const cancelled = map[token];
  if (!cancelled) return { next: map, cancelled };
  const next = Object.fromEntries(Object.entries(map).filter(([k]) => k !== token));
  return { next, cancelled };
}

/** Everything still waiting, for unmount / pagehide. */
export function flushAll(map: ScheduledMap): { next: ScheduledMap; commits: ScheduledCommit[] } {
  return { next: {}, commits: Object.values(map) };
}

export function scheduledIds(map: ScheduledMap): Set<string> {
  return new Set(Object.values(map).flatMap((c) => c.ids));
}

/** Rows not hidden by a pending (undoable) resolve. */
export function visibleItems<T extends { id: string }>(items: readonly T[], hidden: ReadonlySet<string>): T[] {
  return items.filter((i) => !hidden.has(i.id));
}

export function undoMessage(status: ResolvableStatus, items: readonly { clientName: string; exerciseName: string }[]): string {
  const verb = status === 'ACCEPTED' ? 'Accepted' : 'Dismissed';
  const [only] = items;
  if (items.length === 1 && only) return `${verb} ${only.clientName} · ${only.exerciseName}`;
  return `${verb} ${items.length} ${items.length === 1 ? 'call' : 'calls'}`;
}
