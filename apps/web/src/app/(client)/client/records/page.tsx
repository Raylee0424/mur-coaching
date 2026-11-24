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
import { Panel } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Segmented';
import { StatStrip, type StatItem } from '@/components/ui/StatStrip';
import { TABLE, TD, TD_NUM, TH, TH_NUM, THEAD, TR } from '@/components/ui/table';
import { exercisesApi, meApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { firstParam } from '@/lib/form';
import { formatWeight, unitLabel } from '@/lib/units';
import { shortDate } from '../_components/today-model';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const MAX_PICKS = 6;
const DELTA_TONE = { good: 'text-emerald', bad: 'text-rose', neutral: 'text-muted' } as const;
const MICRO = 'font-mono text-micro uppercase text-muted';

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
        <PageHeader title="Personal records" />
        <div className="max-w-xl">
          <EmptyState title="No records yet">Log a session and your heaviest working sets show up here. Warm-ups never count.</EmptyState>
        </div>
      </>
    );
  }

  const series = stats ? trendSeries(stats.trend, unit) : [];
  const strip: StatItem[] = stats
    ? [
        { label: 'Net e1RM', value: formatDeltaWeight(stats.netDeltaKg, unit), delta: stats.netDeltaPct === null ? null : formatDeltaPct(stats.netDeltaPct) },
        { label: 'Sessions', value: String(stats.sessions) },
        { label: 'Latest e1RM', value: stats.trend.length ? formatWeight(stats.trend[stats.trend.length - 1]!.e1rmKg, unit) : '—' },
      ]
    : [];

  return (
    <>
      <PageHeader title="Personal records" meta={`${records.newRecords} new in the last ${records.windowDays} days`} />
      <div className="max-w-5xl space-y-6">
        <Panel title="Rep-range PR matrix" meta="Heaviest working set at each rep count or more">
          <div className="overflow-x-auto">
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
                    <th scope="row" className={`${TD} whitespace-nowrap text-left font-medium`}>
                      <Link href={href(e.exerciseId)} className="hover:text-signal">{e.exerciseName}</Link>
                    </th>
                    {records.brackets.map((reps, i) => {
                      const cell = e.cells[i] ?? null;
                      return (
                        <td key={reps} className={clsx(TD_NUM, cell ? 'text-ink' : 'text-faint')} title={cell ? `Set ${shortDate(cell.achievedAt)}` : undefined}>
                          <span aria-label={cellLabel(e.exerciseName, cell, reps, unit)}>{formatCell(cell, unit)}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {stats ? (
          <Panel title="Session-to-session net progression" meta={`${stats.exercise.name} · e1RM`}>
            <div className="space-y-4 p-4">
              {records.exercises.length > 1 ? (
                <Segmented
                  label="Exercise"
                  items={records.exercises.slice(0, MAX_PICKS).map((e) => ({ href: href(e.exerciseId), label: e.exerciseName, current: e.exerciseId === selectedId }))}
                />
              ) : null}
              {series.length >= 2 ? (
                <>
                  <StatStrip label={`${stats.exercise.name} net progression`} items={strip} />
                  <LineChart points={series} unit={unitLabel(unit)} title={`${stats.exercise.name} estimated one-rep max by session`} />
                  <details className="text-meta text-muted">
                    <summary className="cursor-pointer">Chart data</summary>
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
                </>
              ) : (
                <p className="text-meta text-muted">Log this lift in two sessions to see your net progression.</p>
              )}
            </div>
          </Panel>
        ) : null}

        <Panel title="Exercise statistics" meta={`Last ${records.windowDays} days`}>
          <div className="overflow-x-auto">
            <table className={TABLE}>
              <caption className="sr-only">Working sets, average RPE and e1RM change per exercise over the last {records.windowDays} days</caption>
              <thead className={THEAD}>
                <tr>
                  <th scope="col" className={TH}>Exercise</th>
                  <th scope="col" className={TH_NUM}>Best e1RM</th>
                  <th scope="col" className={TH_NUM}>Sets</th>
                  <th scope="col" className={TH_NUM}>Avg RPE</th>
                  <th scope="col" className={TH_NUM}>Net delta</th>
                </tr>
              </thead>
              <tbody>
                {records.exercises.map((e) => {
                  const d = formatDeltaPct(e.stats.netDeltaPct);
                  return (
                    <tr key={e.exerciseId} className={TR}>
                      <th scope="row" className={`${TD} text-left font-medium`}>
                        <Link href={href(e.exerciseId)} className="hover:text-signal">{e.exerciseName}</Link>
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
        </Panel>
        <p className={MICRO}>e1RM uses the Epley formula on your top working set.</p>
      </div>
    </>
  );
}
