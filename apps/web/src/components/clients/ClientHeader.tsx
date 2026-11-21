import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ClientView, WeightUnit } from '@coaching/shared';
import { CLIENT_STATUS_META as STATUS } from './status';
import { Badge } from '@/components/ui/Badge';
import { programWeek } from '@/lib/format';
import { formatWeight } from '@/lib/units';

export interface HeaderStats {
  adherencePct: number | null;
  weeklyVolumeKg: number | null;
  pending: number;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

export function ClientHeader({
  client,
  stats,
  unit,
  actions,
}: {
  client: ClientView;
  stats: HeaderStats;
  unit: WeightUnit;
  actions?: ReactNode;
}) {
  const assignment = client.activeAssignment;
  const week = assignment ? programWeek(assignment.startDate, assignment.program.durationWeeks) : null;
  const items = [
    { label: 'Adherence', value: stats.adherencePct === null ? '—' : `${Math.round(stats.adherencePct)}%` },
    { label: 'Weekly volume', value: stats.weeklyVolumeKg === null ? '—' : formatWeight(stats.weeklyVolumeKg, unit) },
    { label: 'Pending calls', value: String(stats.pending) },
  ];
  return (
    <section aria-label="Client summary" className="mb-6 flex flex-wrap items-center justify-between gap-5 rounded-lg border border-line bg-card p-5">
      <div className="flex min-w-0 items-center gap-4">
        <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-container font-display text-lg font-bold text-primary">
          {initials(client.name)}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-extrabold tracking-tight">{client.name}</h1>
            <Badge tone={STATUS[client.status].tone}>{STATUS[client.status].label}</Badge>
          </div>
          <p className="truncate text-sm text-muted">{client.email}</p>
          <p className="text-sm">
            {assignment ? (
              <>
                <span className="font-semibold">{assignment.program.name}</span>
                <span className="text-muted">
                  {' '}
                  · Week {week} of {assignment.program.durationWeeks}
                </span>
              </>
            ) : (
              <span className="text-muted">
                No program assigned ·{' '}
                <Link href="/coach/programs" className="font-semibold text-primary-soft underline">
                  Assign a program
                </Link>
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <dl className="flex gap-6">
          {items.map((i) => (
            <div key={i.label}>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{i.label}</dt>
              <dd className="font-display text-xl font-bold tabular-nums">{i.value}</dd>
            </div>
          ))}
        </dl>
        {actions}
      </div>
    </section>
  );
}
