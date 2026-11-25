import { HEALTH_LIMITS, Role } from '@coaching/shared';
import { HealthHistory, HealthOverview } from '@/components/health/HealthOverview';
import { loadStepBoard } from '@/components/health/load-board';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Segmented';
import { healthApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { firstParam } from '@/lib/form';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const RANGES = [7, 30, 90] as const;

/** Steps and health sync (`athlete_web_step_tracking_health_sync_weekly_check_in`, steps half) with full daily history. */
export default async function HealthPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser(Role.CLIENT);
  const params = await searchParams;
  const requested = Number(firstParam(params.days));
  const days = (RANGES as readonly number[]).includes(requested) ? requested : HEALTH_LIMITS.defaultDays;
  const group = firstParam(params.group);
  const [overview, { groups, board }] = await Promise.all([healthApi.overview(days), loadStepBoard(group)]);
  const query = (d: number): string => `/client/health?${new URLSearchParams({ days: String(d), ...(group ? { group } : {}) }).toString()}`;

  return (
    <>
      <PageHeader
        title="Steps & Health Sync"
        back={{ href: '/client/profile', label: 'Back to profile' }}
        meta={<Badge tone="slate">PWA · Manual &amp; file import</Badge>}
        actions={<Segmented label="History range" items={RANGES.map((d) => ({ href: query(d), label: `${d}D`, current: d === days }))} />}
      />
      <div className="space-y-6">
        <HealthOverview overview={overview} board={board} groups={groups} today={new Date().toISOString().slice(0, 10)} basePath={`/client/health?days=${days}`} />
        <HealthHistory overview={overview} />
      </div>
    </>
  );
}
