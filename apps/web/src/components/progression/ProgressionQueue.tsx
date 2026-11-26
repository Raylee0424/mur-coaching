'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RecommendationQueueItem, RecommendationQueueResponse, ResolvableStatus, WeightUnit } from '@coaching/shared';
import { bulkResolveRecommendations } from '@/actions/progression';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchField } from '@/components/ui/SearchField';
import { StatStrip } from '@/components/ui/StatStrip';
import { useToast } from '@/components/ui/Toast';
import { formatTarget } from '@/lib/format';
import { initials } from '@/lib/initials';
import { formatWeight } from '@/lib/units';
import { ACTION_META, ActionBadge } from './ActionBadge';
import {
  ACTION_FILTERS,
  cancel,
  flushAll,
  groupByClient,
  pruneSelection,
  queueHref,
  schedule,
  scheduledIds,
  selectedText,
  selectionState,
  toggleAll,
  suggestionsText,
  toggleId,
  undoMessage,
  visibleItems,
  type ActionFilter,
  type ScheduledMap,
} from './queue-model';
import { plainReason } from './reason-model';
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
  const groups = groupByClient(items);

  return (
    <>
      <PageHeader
        title="Progression Queue"
        meta={`${counts.total} pending`}
        actions={<SearchField value={q} label="Search the queue by client or lift" placeholder="Filter by client or lift..." hrefFor={hrefFor} />}
      />
      <div className="space-y-5">
        <StatStrip
          label="Queue summary"
          dense
          items={[
            { label: 'Targets to review', value: String(counts.total), emphasis: counts.total > 0 },
            { label: 'Add weight', value: String(counts.byAction.INCREASE_LOAD) },
            { label: 'Add reps', value: String(counts.byAction.INCREASE_REPS) },
            { label: 'Lighter weeks', value: String(counts.byAction.DELOAD) },
          ]}
        />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav aria-label="Filter by call" className="flex flex-wrap items-center gap-2">
            <Link
              href={queueHref('ALL', q)}
              aria-current={action === 'ALL' ? 'page' : undefined}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 font-sans text-label-md transition-colors',
                action === 'ALL' ? 'border-primary bg-raised text-ink' : 'border-line bg-card text-muted hover:text-ink',
              )}
            >
              All <span className="tabular-nums">({counts.total})</span>
            </Link>
            {ACTION_FILTERS.map((a) => {
              const meta = ACTION_META[a];
              const on = action === a;
              return (
                <Link
                  key={a}
                  href={queueHref(a, q)}
                  title={meta.code}
                  aria-current={on ? 'page' : undefined}
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-sans text-label-sm transition-colors',
                    meta.box,
                    meta.text,
                    on ? 'ring-1 ring-inset ring-current' : 'opacity-85 hover:opacity-100',
                  )}
                >
                  <Icon icon={meta.icon} size={14} />
                  {meta.label} <span className="tabular-nums">({counts.byAction[a]})</span>
                </Link>
              );
            })}
          </nav>

          {items.length > 0 ? (
            <label className="inline-flex cursor-pointer items-center gap-2 font-sans text-label-md text-muted">
              <input
                type="checkbox"
                checked={state === 'all'}
                ref={(el) => {
                  if (el) el.indeterminate = state === 'some';
                }}
                onChange={() => setSelected(toggleAll(items, selected))}
                className="size-4 rounded"
              />
              Select all shown
            </label>
          ) : null}
        </div>

        {items.length === 0 ? (
          filtersActive ? (
            <EmptyState title="No calls match">
              <Link href="/coach/progression" className="text-primary hover:underline">
                Clear filters
              </Link>
            </EmptyState>
          ) : (
            <EmptyState title="Queue is clear">New calls appear after clients log sessions.</EmptyState>
          )
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <section key={group.clientId} aria-labelledby={`queue-client-${group.clientId}`} className="rounded-md border border-line bg-card">
                <header className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
                  <span
                    aria-hidden="true"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-raised font-mono text-label-md text-primary"
                  >
                    {initials(group.clientName)}
                  </span>
                  <h2 id={`queue-client-${group.clientId}`} className="min-w-0 truncate font-display text-title-md text-ink">
                    <Link href={`/coach/clients/${group.clientId}?tab=lifts`} className="hover:text-primary">
                      {group.clientName}
                    </Link>
                  </h2>
                  <span className="ml-auto shrink-0 font-sans text-label-md text-muted">{suggestionsText(group.items.length)}</span>
                </header>
                <ul className="divide-y divide-line">
                  {group.items.map((item) => (
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
                </ul>
              </section>
            ))}
          </div>
        )}

        <p aria-live="polite" className="sr-only">
          {selected.size > 0 ? selectedText(selected.size) : ''}
        </p>
        {selected.size > 0 ? (
          <div
            role="region"
            aria-label="Bulk actions"
            className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom)+0.5rem)] z-30 flex flex-wrap items-center gap-3 rounded-full border border-line bg-raised px-4 py-2 md:bottom-4"
          >
            <span className="font-sans text-label-md text-ink">{selectedText(selected.size)}</span>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button variant="primary" className="ml-auto" onClick={() => resolve([...selected], 'ACCEPTED')}>
              Accept selected ({selected.size})
            </Button>
          </div>
        ) : null}

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
  const current = item.current ? `${formatWeight(item.current.weightKg, unit)} × ${item.current.reps}` : '—';
  const who = `${item.clientName} ${item.exerciseName}`;
  return (
    <li
      className={clsx(
        'grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-3 px-4 py-4 transition-colors sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-5',
        selected && 'bg-raised shadow-[inset_3px_0_0_theme(colors.primary.DEFAULT)]',
      )}
    >
      <label className="-m-2 inline-flex size-11 items-center justify-center">
        <input type="checkbox" aria-label={`Select ${who}`} checked={selected} onChange={onToggle} className="size-4 rounded" />
      </label>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-sans text-label-lg text-ink">{item.exerciseName}</span>
          <ActionBadge action={item.action} showCode />
        </div>
        <div className="flex flex-wrap items-center gap-x-1.5 font-mono text-label-md tabular-nums text-ink">
          <span>{current}</span>
          <span className="text-muted">→</span>
          <span className={ACTION_META[item.action].text}>{proposed || '—'}</span>
        </div>
        <p className="break-words font-sans text-body-md text-muted">
          {plainReason(item, unit)}{' '}
          <button
            type="button"
            aria-label={`Why this call for ${who}`}
            onClick={onWhy}
            className="font-sans text-label-sm text-primary underline hover:text-primary-soft"
          >
            Why?
          </button>
        </p>
      </div>
      <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-1 sm:flex sm:items-center">
        <Button variant="secondary" size="sm" className="w-full sm:w-auto" aria-label={`Dismiss ${who}`} onClick={() => onResolve('DISMISSED')}>
          Dismiss
        </Button>
        <Button variant="primary" size="sm" className="w-full sm:w-auto" aria-label={`Accept ${who}`} onClick={() => onResolve('ACCEPTED')}>
          Accept
        </Button>
      </div>
    </li>
  );
}
