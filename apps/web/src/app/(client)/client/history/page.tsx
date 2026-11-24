import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Role } from '@coaching/shared';
import { TrendChart } from '@/components/workout-logs/TrendChart';
import { HistorySessions } from '@/components/workout-logs/HistorySessions';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { ToastOnMount } from '@/components/ui/ToastOnMount';
import { progressionApi, workoutLogsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { firstParam } from '@/lib/form';
import { formatWeight, kgToDisplay, unitLabel } from '@/lib/units';
import { formatStepValue } from '@/components/logger/logger-model';
import { shortDate } from '../_components/today-model';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const MAX_LIFTS = 8;
const MAX_POINTS = 12;

export default async function HistoryPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser(Role.CLIENT);
  const params = await searchParams;
  const tab = firstParam(params.tab) === 'charts' ? 'charts' : 'sessions';
  const cursor = firstParam(params.cursor);
  const unit = user.weightUnit;

  return (
    <>
      <PageHeader
        title="History"
        actions={
          <Link href="/client/records" className={buttonClass('ghost', '', 'sm')}>
            Records
          </Link>
        }
      />
      <div className="max-w-xl space-y-5">
        <Segmented
          label="History views"
          items={[
            { href: '/client/history', label: 'Sessions', current: tab === 'sessions' },
            { href: '/client/history?tab=charts', label: 'Per-lift charts', current: tab === 'charts' },
          ]}
        />
        {tab === 'sessions' ? (
          <SessionsTab userId={user.id} unit={unit} cursor={cursor} logged={firstParam(params.logged) === '1'} />
        ) : (
          <ChartsTab userId={user.id} unit={unit} />
        )}
      </div>
    </>
  );
}

async function SessionsTab({ userId, unit, cursor, logged }: { userId: string; unit: 'KG' | 'LB'; cursor: string | undefined; logged: boolean }) {
  const page = await workoutLogsApi.listForClient(userId, { limit: 20, ...(cursor ? { cursor } : {}) });
  return (
    <>
      {logged ? <ToastOnMount message="Session logged. Your targets were updated." tone="ok" /> : null}
      <HistorySessions logs={page.items} unit={unit} editable />
      <div className="flex flex-wrap gap-3">
        {cursor ? (
          <Link href="/client/history" className={buttonClass('secondary', undefined, 'lg')}>
            Newest
          </Link>
        ) : null}
        {page.nextCursor ? (
          <Link href={`/client/history?cursor=${encodeURIComponent(page.nextCursor)}`} className={buttonClass('secondary', undefined, 'lg')}>
            Older sessions
          </Link>
        ) : null}
      </div>
    </>
  );
}

async function ChartsTab({ userId, unit }: { userId: string; unit: 'KG' | 'LB' }) {
  // Lifts come from the most recent sessions, newest first.
  const recent = await workoutLogsApi.listForClient(userId, { limit: 30 });
  const lifts = new Map<string, string>();
  for (const log of recent.items) for (const el of log.exerciseLogs) if (!lifts.has(el.exerciseId)) lifts.set(el.exerciseId, el.exercise.name);
  const ids = [...lifts.keys()].slice(0, MAX_LIFTS);
  const histories = await Promise.all(ids.map((id) => progressionApi.history(userId, id).catch(() => null)));

  const cards = histories.flatMap((h, i) => {
    const id = ids[i];
    if (!h || !id || h.series.length === 0) return [];
    return [{ id, name: lifts.get(id) ?? h.exercise.name, series: h.series.slice(-MAX_POINTS) }];
  });

  if (cards.length === 0) {
    return <EmptyState title="No charts yet">Log a few sessions and each lift gets a weight and effort trend.</EmptyState>;
  }

  return (
    <div className="space-y-6">
      {cards.map(({ id, name, series }) => {
        const weights = series.map((s) => ({ label: shortDate(s.performedAt), value: kgToDisplay(s.topWeightKg, unit) }));
        const rpes = series.flatMap((s) => (s.avgRpe === null ? [] : [{ label: shortDate(s.performedAt), value: s.avgRpe }]));
        const avgRpe = rpes.length > 0 ? rpes.reduce((a, p) => a + p.value, 0) / rpes.length : null;
        const latest = series[series.length - 1];
        return (
          <section key={id} aria-labelledby={`lift-${id}`} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id={`lift-${id}`} className="font-sans text-ui font-semibold" style={{ fontStretch: '100%', letterSpacing: 0 }}>
                {name}
              </h2>
              <Link href={`/client/lifts/${id}`} className={buttonClass('ghost', undefined, 'sm')}>
                Lift detail
                <Icon icon={ArrowRight} />
              </Link>
            </div>
            <Panel title={`Top-set weight · ${unitLabel(unit)}`} meta={latest ? formatWeight(latest.topWeightKg, unit) : undefined}>
              <div className="p-4">
                <TrendChart points={weights} title={`${name} top-set weight over time`} unit={unitLabel(unit)} decimals={2} />
              </div>
            </Panel>
            <Panel title="Session RPE" meta={avgRpe === null ? 'No RPE logged' : `avg ${formatStepValue('rpe', avgRpe)}`}>
              {rpes.length > 0 ? (
                <div className="p-4">
                  <TrendChart points={rpes} title={`${name} average RPE over time`} unit="RPE" tone="sky" />
                </div>
              ) : null}
            </Panel>
          </section>
        );
      })}
    </div>
  );
}
