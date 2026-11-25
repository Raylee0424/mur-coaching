import clsx from 'clsx';
import Link from 'next/link';
import { Role } from '@coaching/shared';
import { LineChart } from '@/components/charts/LineChart';
import {
  bracketLabel,
  cellLabel,
  formatCell,
  formatDeltaPct,
  formatDeltaWeight,
  pickExerciseId,
  trendSeries,
} from '@/components/records/records-model';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { buttonClass } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Segmented';
import { TABLE, TD, TD_NUM, TH, TH_NUM, THEAD, TR } from '@/components/ui/table';
import { exercisesApi, meApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { firstParam } from '@/lib/form';
import { formatWeight, unitLabel } from '@/lib/units';
import { shortDate } from '../_components/today-model';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const MAX_PICKS = 6;
const DELTA_TONE = { good: 'text-emerald', bad: 'text-rose', neutral: 'text-muted' } as const;

export default async function RecordsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser(Role.CLIENT);
  const unit = user.weightUnit;
  const params = await searchParams;
  const records = await meApi.records();
  const selectedId = pickExerciseId(records.exercises, firstParam(params.exercise));
  const stats = selectedId ? await exercisesApi.stats(selectedId) : null;
  const href = (id: string) => `/client/records?exercise=${encodeURIComponent(id)}`;

  if (records.exercises.length === 0) {
    return (
      <>
        <PageHeader title="Personal Records & Net Progression" meta={<Badge tone="signal">PRO</Badge>} actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/client/analytics/muscles" className={buttonClass('secondary', undefined, 'sm')}>
              Muscle Map
            </Link>
            <Link href="/client/coach-ai" className={buttonClass('secondary', undefined, 'sm')}>
              Ask MUR AI Coach
            </Link>
          </div>
        } />
        <div className="max-w-xl">
          <EmptyState title="No records yet">Log a session and your heaviest working sets show up here. Warm-ups never count.</EmptyState>
        </div>
      </>
    );
  }

  const series = stats ? trendSeries(stats.trend, unit) : [];
  const windowCutoff = Date.now() - records.windowDays * 86_400_000;

  return (
    <>
      <PageHeader
        title="Personal Records & Net Progression"
        meta={<Badge tone="signal">PRO</Badge>}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/client/analytics/muscles" className={buttonClass('secondary', undefined, 'sm')}>
              Muscle Map
            </Link>
            <Link href="/client/coach-ai" className={buttonClass('secondary', undefined, 'sm')}>
              Ask MUR AI Coach
            </Link>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Section 1: Rep-Range PR Matrix (`athlete_web_personal_records_net_progression_pro`) */}
        <section className="overflow-hidden rounded-md border border-line bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
            <div>
              <h2 className="font-display text-title-md text-ink">Rep-Range PR Matrix (1RM – 20RM)</h2>
              <p className="text-label-md text-muted">All-time verified working-set and tested maxes across rep brackets.</p>
            </div>
            <span className="rounded-full border border-primary/40 bg-primary-container px-3 py-1 font-mono text-label-sm text-primary">
              {records.newRecords} New PR{records.newRecords === 1 ? '' : 's'} ({records.windowDays}d)
            </span>
          </div>

          <div className="relative overflow-x-auto">
            <table className={TABLE}>
              <caption className="sr-only">Heaviest working set per exercise and rep bracket. Warm-ups are excluded.</caption>
              <thead className={THEAD}>
                <tr>
                  <th scope="col" className={TH}>Exercise</th>
                  {records.brackets.map((reps) => (
                    <th key={reps} scope="col" className={TH_NUM}>{bracketLabel(reps)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.exercises.map((e) => (
                  <tr key={e.exerciseId} className={TR}>
                    <th scope="row" className={clsx(TD, 'whitespace-nowrap text-left font-medium')}>
                      <Link href={href(e.exerciseId)} className={clsx('hover:text-primary', e.exerciseId === selectedId && 'text-primary')}>
                        {e.exerciseName}
                      </Link>
                    </th>
                    {records.brackets.map((reps, i) => {
                      const cell = e.cells[i] ?? null;
                      const isRecent = cell ? Date.parse(cell.achievedAt) >= windowCutoff : false;
                      return (
                        <td
                          key={reps}
                          className={clsx(
                            TD_NUM,
                            !cell ? 'text-faint' : reps === 1 ? 'text-primary' : isRecent ? 'text-emerald' : 'text-ink',
                          )}
                          title={cell ? `Set ${shortDate(cell.achievedAt)}` : undefined}
                        >
                          <span aria-label={cellLabel(e.exerciseName, cell, reps, unit)}>{formatCell(cell, unit)}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 2: Net Progression Chart (Left) + Exercise Statistics Table (Right) */}
        <section className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-12">
          {stats ? (
            <div className="flex h-full flex-col justify-between gap-4 rounded-md border border-line bg-card p-5 xl:col-span-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-label-sm uppercase text-primary">SESSION-TO-SESSION NET PROGRESSION</span>
                  <h2 className="mt-0.5 font-display text-title-md text-ink">{stats.exercise.name} e1RM Trend</h2>
                </div>
                <span className="rounded-full border border-primary/40 bg-primary-container px-3 py-1 font-mono text-label-sm text-primary">
                  {formatDeltaWeight(stats.netDeltaKg, unit)} ({stats.sessions} {stats.sessions === 1 ? 'Session' : 'Sessions'})
                </span>
              </div>

              {records.exercises.length > 1 ? (
                <Segmented
                  label="Exercise"
                  items={records.exercises.slice(0, MAX_PICKS).map((e) => ({
                    href: href(e.exerciseId),
                    label: e.exerciseName,
                    current: e.exerciseId === selectedId,
                  }))}
                />
              ) : null}

              {series.length >= 2 ? (
                <div className="space-y-3 rounded-sm border border-line bg-canvas-low p-4">
                  <LineChart points={series} unit={unitLabel(unit)} title={`${stats.exercise.name} estimated one-rep max by session`} />
                  <details className="text-meta text-muted">
                    <summary className="cursor-pointer font-mono text-label-sm text-primary">Session e1RM Breakdown</summary>
                    <table className={`${TABLE} mt-2`}>
                      <caption className="sr-only">Estimated one-rep max per session, oldest first</caption>
                      <thead className={THEAD}>
                        <tr>
                          <th scope="col" className={TH}>Date</th>
                          <th scope="col" className={TH_NUM}>Top set</th>
                          <th scope="col" className={TH_NUM}>e1RM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.trend.map((p) => (
                          <tr key={p.logId} className={TR}>
                            <td className={`${TD} font-mono text-muted`}>{shortDate(p.performedAt)}</td>
                            <td className={TD_NUM}>{`${formatWeight(p.topWeightKg, unit)} × ${p.topSetReps}`}</td>
                            <td className={TD_NUM}>{formatWeight(p.e1rmKg, unit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center rounded-sm border border-line bg-canvas-low p-6">
                  <p className="text-meta text-muted">Log this lift in two sessions to plot your net e1RM progression.</p>
                </div>
              )}
            </div>
          ) : null}

          <div className={clsx('h-full overflow-hidden rounded-md border border-line bg-card', stats ? 'xl:col-span-6' : 'xl:col-span-12')}>
            <div className="flex items-center justify-between gap-3 border-b border-line p-5">
              <h2 className="font-display text-title-md text-ink">Exercise Statistics</h2>
              <span className="rounded-full border border-primary/40 bg-primary-container px-2.5 py-0.5 font-mono text-label-sm text-primary">
                PRO TELEMETRY · {records.windowDays}D
              </span>
            </div>
            <div className="relative overflow-x-auto">
              <table className={TABLE}>
                <caption className="sr-only">Working sets, average RPE and e1RM change per exercise over the last {records.windowDays} days</caption>
                <thead className={THEAD}>
                  <tr>
                    <th scope="col" className={TH}>Exercise</th>
                    <th scope="col" className={TH_NUM}>Best e1RM</th>
                    <th scope="col" className={TH_NUM}>Sets ({records.windowDays}D)</th>
                    <th scope="col" className={TH_NUM}>Avg RPE</th>
                    <th scope="col" className={TH_NUM}>Net Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {records.exercises.map((e) => {
                    const d = formatDeltaPct(e.stats.netDeltaPct);
                    return (
                      <tr key={e.exerciseId} className={TR}>
                        <th scope="row" className={`${TD} text-left font-medium`}>
                          <Link href={href(e.exerciseId)} className="hover:text-primary">{e.exerciseName}</Link>
                        </th>
                        <td className={TD_NUM}>{formatWeight(e.bestE1rmKg, unit)}</td>
                        <td className={TD_NUM}>{e.stats.sets}</td>
                        <td className={TD_NUM}>{e.stats.avgRpe === null ? '—' : e.stats.avgRpe.toFixed(1)}</td>
                        <td className={clsx(TD_NUM, DELTA_TONE[d.tone])}>{d.text}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <p className="font-mono text-label-sm uppercase text-muted">e1RM uses the Epley formula on your top working set.</p>
      </div>
    </>
  );
}
