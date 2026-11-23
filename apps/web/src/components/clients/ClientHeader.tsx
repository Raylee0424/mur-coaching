import Link from 'next/link';
import type { ClientView, WeightUnit } from '@coaching/shared';
import { Badge } from '@/components/ui/Badge';
import { StatStrip } from '@/components/ui/StatStrip';
import { programWeek } from '@/lib/format';
import { formatWeight } from '@/lib/units';
import { CLIENT_STATUS_META as STATUS } from './status';

export interface HeaderStats {
  adherencePct: number | null;
  weeklyVolumeKg: number | null;
  pending: number;
}

/** Program context for the top bar's `meta` slot. */
export function clientMeta(client: ClientView): string | null {
  const a = client.activeAssignment;
  if (!a) return null;
  return `${a.program.name} · W${programWeek(a.startDate, a.program.durationWeeks)}/${a.program.durationWeeks}`;
}

/** The strip under the top bar: status, contact, program and headline numbers. */
export function ClientHeader({ client, stats, unit }: { client: ClientView; stats: HeaderStats; unit: WeightUnit }) {
  const assignment = client.activeAssignment;
  return (
    <section aria-label="Client summary" className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ui">
        <Badge tone={STATUS[client.status].tone}>{STATUS[client.status].label}</Badge>
        <span className="text-meta text-muted">{client.email}</span>
        {assignment ? null : (
          <span className="text-muted">
            No program assigned ·{' '}
            <Link href="/coach/programs" className="text-ink underline">
              Assign a program
            </Link>
          </span>
        )}
      </div>
      <StatStrip
        label="Client summary numbers"
        items={[
          { label: 'Adherence · 28d', value: stats.adherencePct === null ? '—' : `${Math.round(stats.adherencePct)}%` },
          { label: 'Weekly volume', value: stats.weeklyVolumeKg === null ? '—' : formatWeight(stats.weeklyVolumeKg, unit) },
          { label: 'Pending calls', value: String(stats.pending), emphasis: stats.pending > 0 },
        ]}
      />
    </section>
  );
}
