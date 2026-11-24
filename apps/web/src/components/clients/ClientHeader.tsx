import clsx from 'clsx';
import Link from 'next/link';
import type { ClientView, WeightUnit } from '@coaching/shared';
import { Badge } from '@/components/ui/Badge';
import { programWeek } from '@/lib/format';
import { formatWeight } from '@/lib/units';
import { CLIENT_STATUS_META as STATUS } from './status';

export interface HeaderStats {
  adherencePct: number | null;
  weeklyVolumeKg: number | null;
  pending: number;
}

function initials(name: string): string {
  const parts = name.replace(' (Demo)', '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase() || '?';
}

/** Program context for the top bar's `meta` slot. */
export function clientMeta(client: ClientView): string | null {
  const a = client.activeAssignment;
  if (!a) return null;
  return `${a.program.name} · W${programWeek(a.startDate, a.program.durationWeeks)}/${a.program.durationWeeks}`;
}

/** Stitch Client Header Card (`coach_client_detail`): avatar, program context, and headline metrics. */
export function ClientHeader({ client, stats, unit }: { client: ClientView; stats: HeaderStats; unit: WeightUnit }) {
  const assignment = client.activeAssignment;
  const adh = stats.adherencePct === null ? null : Math.round(stats.adherencePct);
  return (
    <section
      aria-label="Client summary"
      className="mb-6 flex flex-wrap items-center justify-between gap-6 rounded-md border border-line bg-card p-6"
    >
      <div className="flex items-center gap-4">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-line bg-raised font-display text-title-md text-primary">
          {initials(client.name)}
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-display text-headline-md text-ink">{client.name}</h2>
            <Badge tone={STATUS[client.status].tone}>{STATUS[client.status].label}</Badge>
          </div>
          <p className="mt-0.5 font-sans text-body-md text-muted">
            {assignment ? (
              <>
                {assignment.program.name} · Week {programWeek(assignment.startDate, assignment.program.durationWeeks)} of{' '}
                {assignment.program.durationWeeks} · {client.email}
              </>
            ) : (
              <>
                {client.email} · No program assigned ·{' '}
                <Link href="/coach/programs" className="text-primary hover:underline">
                  Assign a program
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      <dl aria-label="Client summary numbers" className="flex flex-wrap items-center gap-6 tabular-nums sm:gap-8">
        <div>
          <dt className="font-sans text-label-sm uppercase tracking-wider text-muted">Adherence</dt>
          <dd
            className={clsx(
              'mt-0.5 font-display text-title-lg',
              adh === null ? 'text-muted' : adh >= 85 ? 'text-emerald' : adh >= 70 ? 'text-amber' : 'text-rose',
            )}
          >
            {adh === null ? '—' : `${adh}%`}
          </dd>
        </div>
        <div>
          <dt className="font-sans text-label-sm uppercase tracking-wider text-muted">Weekly Volume</dt>
          <dd className="mt-0.5 font-display text-title-lg text-ink">
            {stats.weeklyVolumeKg === null ? '—' : formatWeight(stats.weeklyVolumeKg, unit)}
          </dd>
        </div>
        <div>
          <dt className="font-sans text-label-sm uppercase tracking-wider text-muted">Pending Calls</dt>
          <dd className={clsx('mt-0.5 font-display text-title-lg', stats.pending > 0 ? 'text-primary' : 'text-ink')}>
            {stats.pending}
          </dd>
        </div>
      </dl>
    </section>
  );
}
