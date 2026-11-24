import Link from 'next/link';
import { MUSCLE_WINDOWS, Role } from '@coaching/shared';
import type { MuscleAnalyticsDto } from '@coaching/shared';
import { MuscleMap } from '@/components/analytics/MuscleMap';
import { parseDays, windowFor } from '@/components/analytics/muscle-model';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Segmented';
import { ApiError } from '@/lib/api/client';
import { analyticsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

export default async function MuscleAnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireUser(Role.CLIENT);
  const days = parseDays((await searchParams).days);
  const today = new Date().toISOString().slice(0, 10);
  const { from, to } = windowFor(today, days);

  let data: MuscleAnalyticsDto | null = null;
  let upgrade: string | null = null;
  try {
    data = await analyticsApi.muscles(from, to);
  } catch (err) {
    if (err instanceof ApiError && err.status === 402) upgrade = err.messages.join(' ');
    else throw err;
  }

  const windows = (
    <Segmented
      label="Time window"
      items={MUSCLE_WINDOWS.map((d) => ({ href: d === 7 ? '/client/analytics/muscles' : `/client/analytics/muscles?days=${d}`, label: `${d}d`, current: d === days }))}
    />
  );

  return (
    <>
      <PageHeader
        title="2D Interactive Muscle Analytics"
        meta={<Badge tone="signal">PRO</Badge>}
        back={{ href: '/client/records', label: 'Back to records' }}
        actions={data ? windows : undefined}
      />

      {upgrade ? (
        <div className="max-w-xl">
          <EmptyState
            title="The muscle map is a Pro feature"
            action={
              <Link href="/client/billing" className={buttonClass('primary', undefined, 'md')}>
                See MUR Coaching Pro
              </Link>
            }
          >
            {upgrade} Your logged sets are kept either way: the map fills in as soon as Pro is active.
          </EmptyState>
        </div>
      ) : data && data.sessionCount === 0 ? (
        <div className="max-w-xl space-y-4">
          {windows}
          <EmptyState
            title={`No working sets in the last ${days} days`}
            action={
              <Link href="/client/log" className={buttonClass('primary', undefined, 'md')}>
                Log a session
              </Link>
            }
          >
            Warm-ups never count. Muscles come from each exercise&apos;s primary (full set) and secondary (half set) tags.
          </EmptyState>
        </div>
      ) : data ? (
        <div className="flex flex-col gap-4">
          <p className="font-mono text-label-sm text-muted">
            {data.from} – {data.to} · {data.sessionCount} {data.sessionCount === 1 ? 'session' : 'sessions'} · {data.totalHardSets} hard sets · warm-ups excluded, sets past 5 RIR count half or nothing
          </p>
          <MuscleMap data={data} />
        </div>
      ) : null}
    </>
  );
}
