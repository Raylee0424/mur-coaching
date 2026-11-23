'use client';

import clsx from 'clsx';
import { Check, Info, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RecommendationQueueItem, RecommendationQueueResponse, ResolvableStatus, WeightUnit } from '@coaching/shared';
import { bulkResolveRecommendations } from '@/actions/progression';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchField } from '@/components/ui/SearchField';
import { Segmented } from '@/components/ui/Segmented';
import { TABLE, TD, TH, THEAD } from '@/components/ui/table';
import { useToast } from '@/components/ui/Toast';
import { formatTarget } from '@/lib/format';
import { formatWeight } from '@/lib/units';
import { ACTION_META, ActionBadge } from './ActionBadge';
import {
  ACTION_FILTERS,
  cancel,
  flushAll,
  pruneSelection,
  queueHref,
  schedule,
  scheduledIds,
  selectionState,
  toggleAll,
  toggleId,
  undoMessage,
  visibleItems,
  type ActionFilter,
  type ScheduledMap,
} from './queue-model';
import { WhyDrawer } from './WhyDrawer';

interface Props {
  queue: RecommendationQueueResponse;
  action: ActionFilter;
  q: string;
  unit: WeightUnit;
}

/** How long the Undo toast stays up; the API call is deferred until it expires. */
const UNDO_MS = 5000;

export function ProgressionQueue({ queue, action, q, unit }: Props) {
  const toast = useToast();
  const { items: allItems, counts } = queue;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [why, setWhy] = useState<string | null>(null);
  // Rows hidden while their resolve is in the Undo window or in flight.
  const [scheduled, setScheduled] = useState<ScheduledMap>({});
  const [inFlight, setInFlight] = useState<Set<string>>(new Set());
  const scheduledRef = useRef<ScheduledMap>({});
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const counter = useRef(0);

  const hidden = new Set([...scheduledIds(scheduled), ...inFlight]);
  const items = visibleItems(allItems, hidden);

  useEffect(() => setSelected((s) => pruneSelection(items, s)), [allItems, scheduled, inFlight]); // eslint-disable-line react-hooks/exhaustive-deps
  // Rows that left the server list are no longer "in flight".
  useEffect(() => {
    setInFlight((cur) => {
      const ids = new Set(allItems.map((i) => i.id));
      const next = new Set([...cur].filter((id) => ids.has(id)));
      return next.size === cur.size ? cur : next;
    });
  }, [allItems]);

  const commit = useCallback(
    async (ids: readonly string[], status: ResolvableStatus): Promise<void> => {
      setInFlight((cur) => new Set([...cur, ...ids]));
      const r = await bulkResolveRecommendations([...ids], status);
      if (!r.ok) {
        setInFlight((cur) => new Set([...cur].filter((id) => !ids.includes(id))));
        toast.show({ message: r.error, tone: 'error' });
      }
    },
    [toast],
  );

  const setSched = useCallback((next: ScheduledMap) => {
    scheduledRef.current = next;
    setScheduled(next);
  }, []);

  function resolve(ids: string[], status: ResolvableStatus): void {
    if (ids.length === 0) return;
    const token = `s${++counter.current}`;
    setSched(schedule(scheduledRef.current, token, ids, status));
    setSelected((s) => new Set([...s].filter((id) => !ids.includes(id))));
    const rows = allItems.filter((i) => ids.includes(i.id));
    timers.current.set(
      token,
      setTimeout(() => {
        timers.current.delete(token);
        const { next, cancelled } = cancel(scheduledRef.current, token);
        setSched(next);
        if (cancelled) void commit(cancelled.ids, cancelled.status);
      }, UNDO_MS),
    );
    toast.show({
      message: undoMessage(status, rows),
      tone: 'ok',
      durationMs: UNDO_MS,
      action: {
        label: 'Undo',
        onAction: () => {
          const t = timers.current.get(token);
          if (t) clearTimeout(t);
          timers.current.delete(token);
          setSched(cancel(scheduledRef.current, token).next);
        },
      },
    });
  }

  // Send anything still in the Undo window when the coach leaves the page.
  useEffect(() => {
    const flush = (): void => {
      for (const t of timers.current.values()) clearTimeout(t);
      timers.current.clear();
      const { commits } = flushAll(scheduledRef.current);
      scheduledRef.current = {};
      for (const c of commits) void bulkResolveRecommendations([...c.ids], c.status);
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);

  const state = selectionState(items, selected);
  const filtersActive = q !== '' || action !== 'ALL';
  const hrefFor = useCallback((text: string) => queueHref(action, text), [action]);

  return (
    <>
      <PageHeader
        title="Progression queue"
        meta={`${counts.total} pending`}
        actions={
          <Button size="sm" onClick={() => resolve([...selected], 'ACCEPTED')} disabled={selected.size === 0}>
            <Icon icon={Check} />
            Accept selected <span className="font-mono">{selected.size}</span>
          </Button>
        }
      />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="Filter by call"
            items={[
              { href: queueHref('ALL', q), label: 'All', count: counts.total, current: action === 'ALL' },
              ...ACTION_FILTERS.map((a) => ({
                href: queueHref(a, q),
                label: ACTION_META[a].label,
                count: counts.byAction[a],
                current: action === a,
                icon: ACTION_META[a].icon,
              })),
            ]}
          />
          <SearchField value={q} label="Search the queue by client or lift" placeholder="Filter by client or lift" hrefFor={hrefFor} />
        </div>

        {items.length === 0 ? (
          filtersActive ? (
            <EmptyState title="No calls match">
              <Link href="/coach/progression" className="text-ink underline">
                Clear filters
              </Link>
            </EmptyState>
          ) : (
            <EmptyState title="Queue is clear">New calls appear after clients log sessions.</EmptyState>
          )
        ) : (
          <div className="overflow-x-auto rounded-md border border-line bg-card">
            <table className={clsx(TABLE, 'min-w-[60rem]')}>
              <caption className="sr-only">Pending progression recommendations</caption>
              <thead className={THEAD}>
                <tr>
                  <th scope="col" className={clsx(TH, 'w-12')}>
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={state === 'all'}
                      ref={(el) => {
                        if (el) el.indeterminate = state === 'some';
                      }}
                      onChange={() => setSelected(toggleAll(items, selected))}
                      className="size-4 rounded-sm"
                    />
                  </th>
                  <th scope="col" className={TH}>Client</th>
                  <th scope="col" className={TH}>Exercise</th>
                  <th scope="col" className={TH}>Current</th>
                  <th scope="col" className={TH}>Proposed</th>
                  <th scope="col" className={TH}>Call</th>
                  <th scope="col" className={TH}>Reason</th>
                  <th scope="col" className={TH}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <Row
                    key={item.id}
                    item={item}
                    unit={unit}
                    selected={selected.has(item.id)}
                    onToggle={() => setSelected((s) => toggleId(s, item.id))}
                    onWhy={() => setWhy(item.id)}
                    onResolve={(status) => resolve([item.id], status)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {why ? (
          <WhyDrawer
            recommendationId={why}
            unit={unit}
            onClose={() => setWhy(null)}
            onResolve={(status) => {
              resolve([why], status);
              setWhy(null);
            }}
          />
        ) : null}
      </div>
    </>
  );
}

function Row({
  item,
  unit,
  selected,
  onToggle,
  onWhy,
  onResolve,
}: {
  item: RecommendationQueueItem;
  unit: WeightUnit;
  selected: boolean;
  onToggle: () => void;
  onWhy: () => void;
  onResolve: (status: ResolvableStatus) => void;
}) {
  const proposed = formatTarget(
    { recommendedSets: null, recommendedRepsMin: item.proposed.repsMin, recommendedRepsMax: item.proposed.repsMax, recommendedWeightKg: item.proposed.weightKg },
    unit,
  );
  const who = `${item.clientName} ${item.exerciseName}`;
  return (
    <tr
      className={clsx(
        'border-t border-line transition-colors hover:bg-raised/60',
        selected && 'bg-raised shadow-[inset_2px_0_0_theme(colors.signal.DEFAULT)]',
      )}
    >
      <td className={TD}>
        <input type="checkbox" aria-label={`Select ${who}`} checked={selected} onChange={onToggle} className="size-4 rounded-sm" />
      </td>
      <td className={clsx(TD, 'whitespace-nowrap')}>
        <Link href={`/coach/clients/${item.clientId}?tab=lifts`} className="font-medium hover:underline">
          {item.clientName}
        </Link>
      </td>
      <td className={clsx(TD, 'whitespace-nowrap text-muted')}>{item.exerciseName}</td>
      <td className={clsx(TD, 'whitespace-nowrap font-mono text-muted')}>
        {item.current ? `${formatWeight(item.current.weightKg, unit)} × ${item.current.reps}` : '—'}
      </td>
      <td className={clsx(TD, 'whitespace-nowrap font-mono font-medium', ACTION_META[item.action].text)}>{proposed || '—'}</td>
      <td className={clsx(TD, 'whitespace-nowrap')}>
        <ActionBadge action={item.action} />
      </td>
      <td className={TD}>
        <span className="line-clamp-2 max-w-[22rem] text-meta text-muted" title={item.reason}>
          {item.reason}
        </span>
      </td>
      <td className={TD}>
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" aria-label={`Why this call for ${who}`} onClick={onWhy}>
            <Icon icon={Info} />
            Why
          </Button>
          <Button variant="secondary" size="sm" aria-label={`Accept ${who}`} onClick={() => onResolve('ACCEPTED')}>
            <Icon icon={Check} />
            Accept
          </Button>
          <Button variant="ghost" size="sm" className="w-8 px-0" aria-label={`Dismiss ${who}`} onClick={() => onResolve('DISMISSED')}>
            <Icon icon={X} />
          </Button>
        </div>
      </td>
    </tr>
  );
}
