import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { MUSCLE_GROUP_LABELS, Role } from '@coaching/shared';
import type { ExerciseStatsDto, MuscleAnalyticsDto, TodayDto, WeightUnit, WorkoutLogDto } from '@coaching/shared';
import { LineChart } from '@/components/charts/LineChart';
import { formatE1rm, trendSeries } from '@/components/records/records-model';
import { TrendChart } from '@/components/workout-logs/TrendChart';
import { HistorySessionDetail } from '@/components/workout-logs/HistorySessionDetail';
import { HistorySessionList } from '@/components/workout-logs/HistorySessionList';
import {
  FILTER_LABELS,
  availableFilters,
  matchesFilter,
  parseFilter,
  pickLog,
  recordCount,
  sessionVolumeKg,
  volumeNumber,
  weekStart,
  type HistoryFilter,
} from '@/components/workout-logs/history-model';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { StatStrip } from '@/components/ui/StatStrip';
import { Term } from '@/components/ui/Term';
import { ToastOnMount } from '@/components/ui/ToastOnMount';
import { analyticsApi, exercisesApi, meApi, progressionApi, workoutLogsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { firstParam } from '@/lib/form';
import { formatWeight, kgToDisplay, unitLabel } from '@/lib/units';
import { formatStepValue } from '@/components/logger/logger-model';
import { shortDate } from '../_components/today-model';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const MAX_LIFTS = 8;
const MAX_POINTS = 12;
const PAGE_SIZE = 20;
/** Upper bound on sessions in one calendar week for the "This week" strip. */
const WEEK_LIMIT = 50;

interface View {
  filter: HistoryFilter;
  cursor: string | undefined;
  log: string | undefined;
  lift: string | undefined;
}

/** History URL with only the params that differ from the defaults. */
function historyHref(v: Partial<View>): string {
  const q = new URLSearchParams();
  if (v.filter && v.filter !== 'all') q.set('filter', v.filter);
  if (v.cursor) q.set('cursor', v.cursor);
  if (v.log) q.set('log', v.log);
  if (v.lift) q.set('lift', v.lift);
  const s = q.toString();
  return s ? `/client/history?${s}` : '/client/history';
}

export default async function HistoryPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser(Role.CLIENT);
  const params = await searchParams;
  const tab = firstParam(params.tab) === 'charts' ? 'charts' : 'sessions';
  const unit = user.weightUnit;

  return (
    <>
      <PageHeader
        title="Workout History & Lift Trends"
        actions={
          <Link href="/client/records" className={buttonClass('secondary', '', 'sm')}>
            PRs &amp; Net Progression
          </Link>
        }
      />
      <div className="space-y-6">
        <Segmented
          label="History views"
          items={[
            { href: '/client/history', label: 'Sessions', current: tab === 'sessions' },
            { href: '/client/history?tab=charts', label: 'Per-Lift Charts', current: tab === 'charts' },
          ]}
        />
        {tab === 'sessions' ? (
          <SessionsTab
            userId={user.id}
            unit={unit}
            view={{
              filter: parseFilter(firstParam(params.filter)),
              cursor: firstParam(params.cursor),
              log: firstParam(params.log),
              lift: firstParam(params.lift),
            }}
            logged={firstParam(params.logged) === '1'}
          />
        ) : (
          <ChartsTab userId={user.id} unit={unit} />
        )}
      </div>
    </>
  );
}

async function SessionsTab({ userId, unit, view, logged }: { userId: string; unit: WeightUnit; view: View; logged: boolean }) {
  const now = new Date();
  const monday = weekStart(now.toISOString());
  const todayIso = now.toISOString().slice(0, 10);
  const [page, week, today, muscles] = await Promise.all([
    workoutLogsApi.listForClient(userId, { limit: PAGE_SIZE, ...(view.cursor ? { cursor: view.cursor } : {}) }),
    workoutLogsApi.listForClient(userId, { from: `${monday}T00:00:00.000Z`, limit: WEEK_LIMIT }),
    meApi.today().catch(() => null),
    // Pro feature (402 otherwise): the "Muscles trained" list is left out without it.
    analyticsApi.muscles(monday, todayIso).catch(() => null),
  ]);

  const toast = logged ? <ToastOnMount message="Session logged. Your targets were updated." tone="ok" /> : null;
  if (page.items.length === 0 && !view.cursor) {
    return (
      <>
        {toast}
        <EmptyState title="No sessions yet">Finish a workout and it shows up here.</EmptyState>
      </>
    );
  }

  const filters = availableFilters(page.items);
  const filter = filters.includes(view.filter) ? view.filter : 'all';
  const shown = page.items.filter((l) => matchesFilter(l, filter));
  const selected = pickLog(shown, view.log);
  const liftIds = selected ? [...new Set(selected.exerciseLogs.map((e) => e.exerciseId))] : [];
  const liftId = view.lift && liftIds.includes(view.lift) ? view.lift : liftIds[0];
  const stats = liftId ? await exercisesApi.stats(liftId).catch(() => null) : null;

  // Phones show one pane: the list, or the detail once a session was tapped (?log=).
  const detailOpen = view.log !== undefined && selected !== null;
  const base = { filter, cursor: view.cursor };

  return (
    <>
      {toast}
      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        <div className={detailOpen ? 'hidden min-w-0 space-y-4 lg:col-span-5 lg:block' : 'min-w-0 space-y-4 lg:col-span-5'}>
          {filters.length > 1 ? (
            <Segmented
              label="Filter sessions"
              items={filters.map((f) => ({ href: historyHref({ ...base, filter: f, cursor: undefined }), label: FILTER_LABELS[f], current: f === filter }))}
            />
          ) : null}
          {shown.length > 0 ? (
            <HistorySessionList logs={shown} unit={unit} selectedId={selected?.id ?? null} hrefFor={(id) => historyHref({ ...base, log: id })} />
          ) : (
            <EmptyState title="No sessions match">Try All workouts, or load older sessions.</EmptyState>
          )}
          <div className="flex flex-wrap gap-3">
            {view.cursor ? (
              <Link href={historyHref({ filter })} className={buttonClass('secondary', undefined, 'md')}>
                Newest
              </Link>
            ) : null}
            {page.nextCursor ? (
              <Link href={historyHref({ filter, cursor: page.nextCursor })} className={buttonClass('secondary', undefined, 'md')}>
                Older Sessions
              </Link>
            ) : null}
          </div>
        </div>

        {selected ? (
          <div className={detailOpen ? 'flex min-w-0 flex-col gap-6 lg:col-span-7' : 'hidden min-w-0 flex-col gap-6 lg:col-span-7 lg:flex'}>
            <Link href={historyHref(base)} className={buttonClass('secondary', 'self-start lg:hidden', 'lg')}>
              <Icon icon={ArrowLeft} size={20} />
              All sessions
            </Link>
            <HistorySessionDetail log={selected} history={page.items} unit={unit} editable />
            {liftId ? (
              <LiftTrend
                lifts={selected.exerciseLogs.map((e) => ({ id: e.exerciseId, name: e.exercise.name }))}
                liftId={liftId}
                stats={stats}
                unit={unit}
                hrefFor={(id) => historyHref({ ...base, log: selected.id, lift: id })}
              />
            ) : null}
            <ThisWeek logs={week.items} today={today} muscles={muscles} unit={unit} />
          </div>
        ) : null}
      </div>
    </>
  );
}

function LiftTrend({
  lifts,
  liftId,
  stats,
  unit,
  hrefFor,
}: {
  lifts: { id: string; name: string }[];
  liftId: string;
  stats: ExerciseStatsDto | null;
  unit: WeightUnit;
  hrefFor: (id: string) => string;
}) {
  const unique = lifts.filter((l, i) => lifts.findIndex((x) => x.id === l.id) === i);
  const name = unique.find((l) => l.id === liftId)?.name ?? 'Lift';
  const latest = stats?.trend[stats.trend.length - 1];
  return (
    <Panel
      title="Lift trend"
      actions={
        <Link href={`/client/lifts/${encodeURIComponent(liftId)}`} className={buttonClass('ghost', undefined, 'sm')}>
          Lift Detail
          <Icon icon={ArrowRight} />
        </Link>
      }
    >
      <div className="space-y-4 p-4 sm:p-6">
        {unique.length > 1 ? (
          <Segmented label="Lift to chart" items={unique.map((l) => ({ href: hrefFor(l.id), label: l.name, current: l.id === liftId }))} />
        ) : null}
        <p className="max-w-prose text-meta text-muted">
          Best <Term id="e1rm" /> per session for {name}, last {MAX_POINTS} sessions, in {unitLabel(unit)}.
          {latest ? (
            <>
              {' '}
              Latest <span className="font-mono text-ink">{formatE1rm(latest.e1rmKg, unit)}</span>.
            </>
          ) : null}
        </p>
        {stats && stats.trend.length > 0 ? (
          <LineChart points={trendSeries(stats.trend, unit)} unit={unitLabel(unit)} title={`${name} estimated 1RM over time`} />
        ) : (
          <p className="text-meta text-muted">No working sets logged for this lift yet.</p>
        )}
      </div>
    </Panel>
  );
}

function ThisWeek({
  logs,
  today,
  muscles,
  unit,
}: {
  logs: WorkoutLogDto[];
  today: TodayDto | null;
  muscles: MuscleAnalyticsDto | null;
  unit: WeightUnit;
}) {
  const program = today?.weekProgress ?? null;
  const records = recordCount(logs);
  const volume = logs.reduce((kg, l) => kg + sessionVolumeKg(l), 0);
  const trained = (muscles?.muscles ?? []).filter((m) => m.hardSets > 0).sort((a, b) => b.hardSets - a.hardSets);
  return (
    <section aria-labelledby="this-week" className="space-y-3">
      <h2 id="this-week" className="font-display text-title-lg text-ink">
        This week
      </h2>
      <StatStrip
        label="This week"
        items={[
          program
            ? { label: 'Sessions', value: String(program.completed), unit: `/ ${program.total}`, note: 'Done of planned, this program week' }
            : { label: 'Sessions', value: String(logs.length), note: 'Logged since Monday' },
          { label: 'Volume', value: volumeNumber(volume, unit), unit: unitLabel(unit), note: 'Working sets since Monday' },
          { label: 'New records', value: String(records), note: 'Set this week and still standing', emphasis: records > 0 },
        ]}
      />
      {muscles ? (
        <Panel title="Muscles trained" meta={`${muscles.totalHardSets} hard sets`}>
          {trained.length > 0 ? (
            <ul className="divide-y divide-line">
              {trained.map((m) => (
                <li key={m.muscle} className="flex items-center justify-between gap-4 px-6 py-2.5">
                  <span className="font-sans text-ui text-ink">{MUSCLE_GROUP_LABELS[m.muscle]}</span>
                  <span className="font-mono text-label-md text-muted tabular-nums">
                    {m.hardSets} {m.hardSets === 1 ? 'set' : 'sets'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-4 text-meta text-muted">No working sets yet this week.</p>
          )}
        </Panel>
      ) : null}
    </section>
  );
}

async function ChartsTab({ userId, unit }: { userId: string; unit: WeightUnit }) {
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
    <div className="space-y-8">
      {cards.map(({ id, name, series }) => {
        const weights = series.map((s) => ({ label: shortDate(s.performedAt), value: kgToDisplay(s.topWeightKg, unit) }));
        const rpes = series.flatMap((s) => (s.avgRpe === null ? [] : [{ label: shortDate(s.performedAt), value: s.avgRpe }]));
        const avgRpe = rpes.length > 0 ? rpes.reduce((a, p) => a + p.value, 0) / rpes.length : null;
        const latest = series[series.length - 1];
        return (
          <section key={id} aria-labelledby={`lift-${id}`} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id={`lift-${id}`} className="font-display text-title-lg text-ink">
                {name}
              </h2>
              <Link href={`/client/lifts/${id}`} className={buttonClass('ghost', undefined, 'sm')}>
                Lift Detail
                <Icon icon={ArrowRight} />
              </Link>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
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
                ) : (
                  <p className="p-4 text-meta text-muted">Log RPE or RIR on sets to see effort trends.</p>
                )}
              </Panel>
            </div>
          </section>
        );
      })}
    </div>
  );
}
