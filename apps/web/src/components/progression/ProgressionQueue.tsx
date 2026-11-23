'use client';

import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import type { RecommendationAction, RecommendationQueueItem, RecommendationQueueResponse, ResolvableStatus, WeightUnit } from '@coaching/shared';
import { bulkResolveRecommendations } from '@/actions/progression';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { formatTarget } from '@/lib/format';
import { formatWeight } from '@/lib/units';
import { ACTION_META, ActionBadge } from './ActionBadge';
import {
  ACTION_FILTERS,
  bulkMessage,
  pruneSelection,
  queueHref,
  selectionState,
  toggleAll,
  toggleId,
  type ActionFilter,
} from './queue-model';
import { WhyDrawer } from './WhyDrawer';

interface Props {
  queue: RecommendationQueueResponse;
  action: ActionFilter;
  q: string;
  unit: WeightUnit;
}

function Current({ item, unit }: { item: RecommendationQueueItem; unit: WeightUnit }) {
  const proposed = formatTarget(
    { recommendedSets: null, recommendedRepsMin: item.proposed.repsMin, recommendedRepsMax: item.proposed.repsMax, recommendedWeightKg: item.proposed.weightKg },
    unit,
  );
  return (
    <span className="block whitespace-nowrap tabular-nums">
      <span className="block text-xs text-muted">
        {item.current ? `${formatWeight(item.current.weightKg, unit)} × ${item.current.reps}` : '—'}
      </span>
      <span aria-hidden="true" className="mr-1 text-muted">
        →
      </span>
      <span className="sr-only"> to </span>
      <span className="font-semibold text-primary">{proposed || '—'}</span>
    </span>
  );
}

export function ProgressionQueue({ queue, action, q, unit }: Props) {
  const router = useRouter();
  const { items, counts } = queue;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [text, setText] = useState(q);
  const [why, setWhy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<RecommendationQueueItem | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const first = useRef(true);

  useEffect(() => setSelected((s) => pruneSelection(items, s)), [items]);
  useEffect(() => setText(q), [q]);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (text.trim() === q.trim()) return;
    const t = setTimeout(() => router.replace(queueHref(action, text)), 300);
    return () => clearTimeout(t);
  }, [text, q, action, router]);

  function resolve(ids: string[], status: ResolvableStatus): void {
    setMessage(null);
    startTransition(async () => {
      const r = await bulkResolveRecommendations(ids, status);
      setConfirm(null);
      if (r.ok) {
        setSelected((s) => new Set([...s].filter((id) => !ids.includes(id))));
        setMessage({ kind: 'ok', text: bulkMessage(status, r.data) });
      } else setMessage({ kind: 'error', text: r.error });
    });
  }

  const state = selectionState(items, selected);
  const chips: { key: ActionFilter; label: string; count: number; icon?: LucideIcon }[] = [
    { key: 'ALL', label: 'All', count: counts.total },
    ...ACTION_FILTERS.map((a: RecommendationAction) => ({ key: a, label: ACTION_META[a].label, count: counts.byAction[a], icon: ACTION_META[a].icon })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <nav aria-label="Filter by call" className="flex flex-wrap gap-1 rounded-full bg-canvas-low p-1 ring-1 ring-inset ring-line">
            {chips.map((c) => {
              const on = c.key === action;
              return (
                <Link
                  key={c.key}
                  href={queueHref(c.key, text)}
                  aria-current={on ? 'page' : undefined}
                  className={clsx(
                    'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors',
                    on ? 'bg-primary text-primary-ink' : 'text-muted hover:text-ink',
                  )}
                >
                  {c.icon ? <Icon icon={c.icon} size={14} /> : null}
                  {c.label}
                  <span className={clsx('tabular-nums', on ? 'text-primary-ink/70' : 'text-muted')}>({c.count})</span>
                </Link>
              );
            })}
          </nav>
          <form role="search" onSubmit={(e) => { e.preventDefault(); router.replace(queueHref(action, text)); }} className="min-w-52 flex-1">
            <label className="block">
              <span className="sr-only">Search the queue by client or lift</span>
              <input
                type="search"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Filter by client or lift…"
                className="block min-h-10 w-full rounded-full border border-line bg-canvas-low px-4 text-sm text-ink placeholder:text-muted/60"
              />
            </label>
          </form>
        </div>
        <Button onClick={() => resolve([...selected], 'ACCEPTED')} disabled={selected.size === 0 || pending}>
          {pending ? 'Working…' : `Accept selected (${selected.size})`}
        </Button>
      </div>

      <p role="status" aria-live="polite" className={clsx('min-h-5 text-sm font-medium', message?.kind === 'error' ? 'text-danger' : 'text-emerald')}>
        {message?.text}
      </p>

      {items.length === 0 ? (
        <EmptyState title={q || action !== 'ALL' ? 'No recommendations match' : 'Queue is clear'}>
          {q || action !== 'ALL' ? (
            <Link href="/coach/progression" className="font-semibold text-primary-soft underline">
              Clear filters
            </Link>
          ) : (
            'Open a client and re-run the engine to generate new recommendations.'
          )}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-card">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <caption className="sr-only">Pending progression recommendations</caption>
            <thead className="border-b border-line bg-raised text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={state === 'all'}
                    ref={(el) => {
                      if (el) el.indeterminate = state === 'some';
                    }}
                    onChange={() => setSelected(toggleAll(items, selected))}
                    className="size-4 accent-primary"
                  />
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">Client / exercise</th>
                <th scope="col" className="px-3 py-3 font-semibold">Current → proposed</th>
                <th scope="col" className="px-3 py-3 font-semibold">Recommendation</th>
                <th scope="col" className="px-3 py-3 font-semibold">Engine reason</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className={clsx('border-b border-line last:border-0', selected.has(item.id) && 'bg-primary-container/30')}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${item.clientName} ${item.exerciseName}`}
                      checked={selected.has(item.id)}
                      onChange={() => setSelected((s) => toggleId(s, item.id))}
                      className="size-4 accent-primary"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/coach/clients/${item.clientId}?tab=lifts`} className="block font-semibold hover:text-primary hover:underline">
                      {item.clientName}
                    </Link>
                    <span className="text-xs text-muted">{item.exerciseName}</span>
                  </td>
                  <td className="px-3 py-3">
                    <Current item={item} unit={unit} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <ActionBadge action={item.action} />
                  </td>
                  <td className="max-w-[15rem] px-3 py-3 text-xs text-muted">
                    <span className="line-clamp-3" title={item.reason}>
                      {item.reason}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="secondary" className="min-h-9 px-3 py-1" aria-label={`Why this call for ${item.clientName} ${item.exerciseName}`} onClick={() => setWhy(item.id)}>
                        Why?
                      </Button>
                      <Button className="min-h-9 px-3 py-1" aria-label={`Accept ${item.clientName} ${item.exerciseName}`} disabled={pending} onClick={() => resolve([item.id], 'ACCEPTED')}>
                        Accept
                      </Button>
                      <Button variant="secondary" className="min-h-9 px-3 py-1" aria-label={`Dismiss ${item.clientName} ${item.exerciseName}`} disabled={pending} onClick={() => setConfirm(item)}>
                        Dismiss
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {why ? <WhyDrawer recommendationId={why} unit={unit} onClose={() => setWhy(null)} /> : null}
      {confirm ? (
        <Sheet
          open
          onClose={() => setConfirm(null)}
          title="Dismiss recommendation"
          description={`The engine's call for ${confirm.clientName}'s ${confirm.exerciseName} will be dismissed. Re-evaluate the client later to get a fresh call.`}
        >
          <footer className="flex justify-between gap-2">
            <Button variant="secondary" onClick={() => setConfirm(null)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={() => resolve([confirm.id], 'DISMISSED')} disabled={pending}>
              {pending ? 'Dismissing…' : 'Confirm'}
            </Button>
          </footer>
        </Sheet>
      ) : null}
    </div>
  );
}
