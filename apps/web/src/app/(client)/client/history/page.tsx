import clsx from 'clsx';
import Link from 'next/link';
import { Role } from '@coaching/shared';
import { TrendChart } from '@/components/workout-logs/TrendChart';
import { HistorySessions } from '@/components/workout-logs/HistorySessions';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { progressionApi, workoutLogsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { firstParam } from '@/lib/form';
import { formatWeight, kgToDisplay, unitLabel } from '@/lib/units';
import { formatStepValue } from '@/components/logger/logger-model';
import { shortDate } from '../_components/today-model';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const MAX_LIFTS = 8;
const MAX_POINTS = 12;

function Tabs({ tab }: { tab: 'sessions' | 'charts' }) {
  const base = 'flex min-h-10 items-center justify-center rounded-full text-sm font-semibold';
  return (
    <nav aria-label="History views" className="grid grid-cols-2 gap-1 rounded-full border border-line bg-card p-1">
      <Link href="/client/history" aria-current={tab === 'sessions' ? 'page' : undefined} className={clsx(base, tab === 'sessions' ? 'bg-raised text-ink' : 'text-muted hover:text-ink')}>
        Sessions
      </Link>
      <Link href="/client/history?tab=charts" aria-current={tab === 'charts' ? 'page' : undefined} className={clsx(base, tab === 'charts' ? 'bg-raised text-ink' : 'text-muted hover:text-ink')}>
        Per-Lift Charts
      </Link>
    </nav>
  );
}

export default async function HistoryPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser(Role.CLIENT);
  const params = await searchParams;
  const tab = firstParam(params.tab) === 'charts' ? 'charts' : 'sessions';
  const cursor = firstParam(params.cursor);
  const unit = user.weightUnit;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <header className="space-y-3 border-b border-line pb-4">
        <h1 className="font-display text-2xl font-extrabold">Training History</h1>
        <Tabs tab={tab} />
      </header>

      {tab === 'sessions' ? (
        <SessionsTab userId={user.id} unit={unit} cursor={cursor} logged={firstParam(params.logged) === '1'} />
      ) : (
        <ChartsTab userId={user.id} unit={unit} />
      )}
    </div>
  );
}

async function SessionsTab({ userId, unit, cursor, logged }: { userId: string; unit: 'KG' | 'LB'; cursor: string | undefined; logged: boolean }) {
  const page = await workoutLogsApi.listForClient(userId, { limit: 20, ...(cursor ? { cursor } : {}) });
  return (
    <>
      {logged ? (
        <p role="status" className="rounded-md border border-emerald bg-emerald-bg px-3 py-2 text-sm font-medium text-emerald">
          Session logged. Your targets were updated.
        </p>
      ) : null}
      <HistorySessions logs={page.items} unit={unit} editable />
      <div className="flex flex-wrap gap-3">
        {cursor ? (
          <Link href="/client/history" className={buttonClass('secondary', 'min-h-12')}>
            Newest
          </Link>
        ) : null}
        {page.nextCursor ? (
          <Link href={`/client/history?cursor=${encodeURIComponent(page.nextCursor)}`} className={buttonClass('secondary', 'min-h-12')}>
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
              <h2 id={`lift-${id}`} className="text-lg font-bold">
                {name}
              </h2>
              <Link href={`/client/lifts/${id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
                Lift Detail →
              </Link>
            </div>
            <article className="space-y-3 rounded-lg border border-line bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Top-set weight ({unitLabel(unit)})</span>
                <span className="text-sm font-semibold text-primary tabular">{latest ? formatWeight(latest.topWeightKg, unit) : ''}</span>
              </div>
              <TrendChart points={weights} title={`${name} top-set weight over time`} unit={unitLabel(unit)} decimals={2} />
            </article>
            <article className="space-y-3 rounded-lg border border-line bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Session RPE trend</span>
                <span className="text-sm font-semibold text-sky tabular">{avgRpe === null ? 'No RPE logged' : `Avg ${formatStepValue('rpe', avgRpe)}`}</span>
              </div>
              {rpes.length > 0 ? <TrendChart points={rpes} title={`${name} average RPE over time`} unit="RPE" tone="sky" /> : null}
            </article>
          </section>
        );
      })}
    </div>
  );
}
