'use client';

import clsx from 'clsx';
import { AlertTriangle, ArrowDown, ArrowUp, Columns3 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { CoachClientStatus, RecommendationAction } from '@coaching/shared';
import type { RosterClientDto } from '@coaching/shared';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { TABLE, TD, TD_NUM, TH, TH_NUM, THEAD, TR } from '@/components/ui/table';
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

function adherenceTone(pct: number | null): string {
  if (pct === null) return 'text-muted';
  if (pct >= 85) return 'text-emerald';
  if (pct >= 70) return 'text-amber';
  return 'text-rose';
}

export function RosterTable({ clients, total, toolbar }: { clients: RosterClientDto[]; total: number; toolbar?: ReactNode }) {
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
    <section aria-label="Client roster" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {toolbar}
        <ColumnsMenu columns={columns} onToggle={toggle} />
      </div>

      <div className="overflow-hidden rounded-md border border-line bg-card">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="font-display text-title-md text-ink">Client Roster</h2>
          <span className="font-sans text-label-sm text-muted tabular-nums">
            Showing {clients.length} of {total} {total === 1 ? 'client' : 'clients'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className={clsx(TABLE, 'min-w-[56rem]')}>
            <caption className="sr-only">Your clients</caption>
            <thead className={THEAD}>
              <tr>
                <th scope="col" className={TH}>Client</th>
                {show('lastSession') ? <th scope="col" className={TH}>Last Session</th> : null}
                {show('program') ? <th scope="col" className={TH}>Current Program</th> : null}
                {show('adherence') ? <th scope="col" className={TH_NUM}>Adherence</th> : null}
                {show('pending') ? <th scope="col" className={TH}>Pending</th> : null}
                {show('rpe') ? <th scope="col" className={TH_NUM}>RPE Trend</th> : null}
                <th scope="col" className={clsx(TH, 'text-right')}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <Row key={client.id} client={client} show={show} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Row({ client, show }: { client: RosterClientDto; show: (c: RosterColumn) => boolean }) {
  const archived = client.status === CoachClientStatus.ARCHIVED;
  const meta = CLIENT_STATUS_META[client.status];
  const trend = rpeTrend(client.avgRpe7d, client.avgRpePrev7d);
  const pendingEntries = (Object.keys(client.pendingByAction) as RecommendationAction[]).filter((a) => client.pendingByAction[a] > 0);
  const reasons = client.needsAttention ? client.attentionReasons : [];
  return (
    <tr className={clsx(TR, archived && 'text-muted')}>
      <td className={TD}>
        <div className="flex flex-wrap items-center gap-2.5">
          {archived ? (
            <span className="font-sans text-label-lg text-muted">{client.name}</span>
          ) : (
            <Link href={`/coach/clients/${client.id}`} className="font-sans text-label-lg text-ink hover:text-primary">
              {client.name}
            </Link>
          )}
          {client.status !== CoachClientStatus.ACTIVE ? <Badge tone={meta.tone}>{meta.label}</Badge> : null}
          {reasons.length > 0 ? (
            <span title={reasons.map((r) => ATTENTION_LABELS[r]).join(', ')} className="inline-flex items-center gap-1">
              <Badge tone="amber" icon={AlertTriangle}>
                {ATTENTION_LABELS[reasons[0]!]}
              </Badge>
              {reasons.length > 1 ? <span className="font-mono text-label-sm text-amber">+{reasons.length - 1}</span> : null}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 text-meta text-muted">{client.email}</div>
      </td>
      {show('lastSession') ? (
        <td className={clsx(TD, 'whitespace-nowrap text-muted')}>
          {client.lastSessionAt ? formatDate(client.lastSessionAt) : <span>No sessions</span>}
        </td>
      ) : null}
      {show('program') ? (
        <td className={TD}>
          {client.activeAssignment ? (
            <span className="text-ink">
              {client.activeAssignment.program.name}
              {client.currentWeek !== null ? <span className="ml-1.5 font-mono text-muted">· W{client.currentWeek}</span> : null}
            </span>
          ) : (
            <span className="text-muted">No program</span>
          )}
        </td>
      ) : null}
      {show('adherence') ? (
        <td className={clsx(TD_NUM, 'font-sans text-label-md', adherenceTone(client.adherencePct))}>
          {client.adherencePct === null ? '—' : `${Math.round(client.adherencePct)}%`}
        </td>
      ) : null}
      {show('pending') ? (
        <td className={TD}>
          {client.pendingCount === 0 ? (
            <span className="font-mono text-muted">0</span>
          ) : (
            <span className="flex flex-wrap gap-2">
              {pendingEntries.map((a) => (
                <Badge key={a} tone={ACTION_META[a].tone} icon={ACTION_META[a].icon}>
                  {client.pendingByAction[a]} pending
                </Badge>
              ))}
            </span>
          )}
        </td>
      ) : null}
      {show('rpe') ? (
        <td className={TD_NUM}>
          {client.avgRpe7d === null ? (
            <span className="text-muted">—</span>
          ) : (
            <>
              {client.avgRpe7d.toFixed(1)}
              {trend && trend.dir !== 'flat' ? (
                <span className={clsx('ml-1.5 inline-flex items-center gap-0.5 text-meta', trend.dir === 'up' ? 'text-amber' : 'text-emerald')}>
                  <Icon icon={trend.dir === 'up' ? ArrowUp : ArrowDown} size={14} /> {Math.abs(trend.delta).toFixed(1)}
                  <span className="sr-only"> {trend.dir === 'up' ? 'higher' : 'lower'} than the week before</span>
                </span>
              ) : null}
            </>
          )}
        </td>
      ) : null}
      <td className={clsx(TD, 'text-right')}>
        {archived ? (
          <RestoreClientButton clientId={client.id} name={client.name} />
        ) : (
          <Link href={`/coach/clients/${client.id}`} className={buttonClass('secondary', undefined, 'sm')}>
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
    <div ref={ref} className="relative ml-auto">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className={buttonClass('secondary', undefined, 'sm')}>
        <Icon icon={Columns3} />
        Columns
      </button>
      {open ? (
        <div id={id} role="group" aria-label="Visible columns" className="absolute right-0 z-20 mt-2 flex w-52 flex-col gap-1.5 rounded-md border border-line bg-card p-3">
          <span className="font-sans text-label-sm uppercase tracking-wider text-muted">Visible Columns</span>
          {ROSTER_COLUMNS.map((c) => (
            <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-sm px-1.5 py-1 font-sans text-label-md text-ink hover:bg-raised">
              <input type="checkbox" checked={columns.includes(c.key)} onChange={() => onToggle(c.key)} className="size-4 rounded" />
              {c.label}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
