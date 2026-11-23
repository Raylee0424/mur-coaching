'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { CoachClientStatus, RecommendationAction } from '@coaching/shared';
import type { RosterClientDto } from '@coaching/shared';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { ACTION_META } from '@/components/progression/ActionBadge';
import { formatDate } from '@/lib/format';
import { RestoreClientButton } from './RestoreClientButton';
import {
  ATTENTION_LABELS,
  DEFAULT_COLUMNS,
  ROSTER_COLUMNS,
  parseColumns,
  rpeTrend,
  type RosterColumn,
} from './roster-model';
import { CLIENT_STATUS_META } from './status';

const STORAGE_KEY = 'rc.roster.columns';

const SHORT_ACTION: Record<RecommendationAction, string> = { INCREASE_LOAD: 'load', INCREASE_REPS: 'reps', HOLD: 'hold', DELOAD: 'deload' };

function adherenceTone(pct: number | null): string {
  if (pct === null) return 'text-muted';
  if (pct >= 85) return 'text-emerald';
  if (pct >= 70) return 'text-amber';
  return 'text-rose';
}

export function RosterTable({ clients, total }: { clients: RosterClientDto[]; total: number }) {
  const [columns, setColumns] = useState<RosterColumn[]>([...DEFAULT_COLUMNS]);

  useEffect(() => {
    try {
      setColumns(parseColumns(window.localStorage.getItem(STORAGE_KEY)));
    } catch {
      /* storage unavailable: keep defaults */
    }
  }, []);

  function toggle(key: RosterColumn): void {
    setColumns((current) => {
      const next = DEFAULT_COLUMNS.filter((c) => (c === key ? !current.includes(c) : current.includes(c)));
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const show = (c: RosterColumn): boolean => columns.includes(c);

  return (
    <section aria-labelledby="roster-heading" className="rounded-lg border border-line bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 id="roster-heading" className="font-display text-lg font-bold">
            Client roster
          </h2>
          <span className="text-sm text-muted">
            Showing {clients.length} of {total} {total === 1 ? 'client' : 'clients'}
          </span>
        </div>
        <ColumnsMenu columns={columns} onToggle={toggle} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <caption className="sr-only">Your clients</caption>
          <thead className="border-b border-line bg-raised text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">Client</th>
              {show('lastSession') ? <th scope="col" className="px-4 py-3 font-semibold">Last session</th> : null}
              {show('program') ? <th scope="col" className="px-4 py-3 font-semibold">Current program</th> : null}
              {show('adherence') ? <th scope="col" className="px-4 py-3 font-semibold">Adherence</th> : null}
              {show('pending') ? <th scope="col" className="px-4 py-3 font-semibold">Pending</th> : null}
              {show('rpe') ? <th scope="col" className="px-4 py-3 font-semibold">RPE trend</th> : null}
              <th scope="col" className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <Row key={client.id} client={client} show={show} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Row({ client, show }: { client: RosterClientDto; show: (c: RosterColumn) => boolean }) {
  const archived = client.status === CoachClientStatus.ARCHIVED;
  const meta = CLIENT_STATUS_META[client.status];
  const trend = rpeTrend(client.avgRpe7d, client.avgRpePrev7d);
  const pendingEntries = (Object.keys(client.pendingByAction) as RecommendationAction[]).filter((a) => client.pendingByAction[a] > 0);
  return (
    <tr className={clsx('border-b border-line last:border-0 hover:bg-raised/40', archived && 'text-muted')}>
      <td className="px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ink">{client.name}</span>
          {client.status !== CoachClientStatus.ACTIVE ? <Badge tone={meta.tone}>{meta.label}</Badge> : null}
        </div>
        <div className="text-xs text-muted">{client.email}</div>
        {client.needsAttention ? (
          <ul className="mt-1 flex flex-wrap gap-1" aria-label="Needs attention">
            {client.attentionReasons.map((r) => (
              <li key={r}>
                <Badge tone="amber">{ATTENTION_LABELS[r]}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </td>
      {show('lastSession') ? (
        <td className="whitespace-nowrap px-4 py-3 tabular-nums">{client.lastSessionAt ? formatDate(client.lastSessionAt) : <span className="text-muted">No sessions</span>}</td>
      ) : null}
      {show('program') ? (
        <td className="px-4 py-3">
          {client.activeAssignment ? (
            <>
              {client.activeAssignment.program.name}
              {client.currentWeek !== null ? <span className="text-muted"> · W{client.currentWeek}</span> : null}
            </>
          ) : (
            <span className="text-muted">No program</span>
          )}
        </td>
      ) : null}
      {show('adherence') ? (
        <td className={clsx('px-4 py-3 font-semibold tabular-nums', adherenceTone(client.adherencePct))}>
          {client.adherencePct === null ? <span className="font-normal text-muted">—</span> : `${Math.round(client.adherencePct)}%`}
        </td>
      ) : null}
      {show('pending') ? (
        <td className="px-4 py-3">
          {client.pendingCount === 0 ? (
            <span className="text-muted">0 pending</span>
          ) : (
            <span className="flex flex-wrap gap-1">
              {pendingEntries.map((a) => (
                <span key={a} className="whitespace-nowrap">
                  <Badge tone={ACTION_META[a].tone} icon={ACTION_META[a].icon}>
                    {client.pendingByAction[a]} {SHORT_ACTION[a]}
                  </Badge>
                </span>
              ))}
            </span>
          )}
        </td>
      ) : null}
      {show('rpe') ? (
        <td className="whitespace-nowrap px-4 py-3 tabular-nums">
          {client.avgRpe7d === null ? (
            <span className="text-muted">—</span>
          ) : (
            <>
              {client.avgRpe7d.toFixed(1)}
              {trend && trend.dir !== 'flat' ? (
                <span className={clsx('ml-1 text-xs', trend.dir === 'up' ? 'text-amber' : 'text-emerald')}>
                  <span aria-hidden="true">{trend.dir === 'up' ? '▲' : '▼'}</span> {Math.abs(trend.delta).toFixed(1)}
                  <span className="sr-only"> {trend.dir === 'up' ? 'higher' : 'lower'} than the week before</span>
                </span>
              ) : null}
            </>
          )}
        </td>
      ) : null}
      <td className="px-5 py-3 text-right">
        {archived ? (
          <RestoreClientButton clientId={client.id} name={client.name} />
        ) : (
          <Link
            href={`/coach/clients/${client.id}`}
            aria-label={`Open ${client.name}`}
            className={buttonClass('secondary', 'min-h-9 py-1')}
          >
            Open
          </Link>
        )}
      </td>
    </tr>
  );
}

function ColumnsMenu({ columns, onToggle }: { columns: RosterColumn[]; onToggle: (c: RosterColumn) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={buttonClass('secondary', 'min-h-9 py-1')}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="4" width="14" height="12" rx="2" />
          <path d="M8 4v12M13 4v12" />
        </svg>
        Columns
      </button>
      {open ? (
        <div id={id} role="group" aria-label="Visible columns" className="absolute right-0 z-20 mt-2 w-52 space-y-1 rounded-lg border border-line-strong bg-raised p-3 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Visible columns</p>
          {ROSTER_COLUMNS.map((c) => (
            <label key={c.key} className="flex min-h-9 cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={columns.includes(c.key)} onChange={() => onToggle(c.key)} className="size-4 accent-primary" />
              {c.label}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
