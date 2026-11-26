import clsx from 'clsx';
import { notFound } from 'next/navigation';
import { RecommendationStatus, Role } from '@coaching/shared';
import type { RecommendationDto } from '@coaching/shared';
import { formatStepValue, formatTargetLine } from '@/components/logger/logger-model';
import { ACTION_META, ActionBadge } from '@/components/progression/ActionBadge';
import { Panel } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatStrip, type StatItem } from '@/components/ui/StatStrip';
import { TABLE, TD, TD_NUM, TH, TH_NUM, THEAD, TR } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiError } from '@/lib/api/client';
import { progressionApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { toNumber } from '@/lib/format';
import { effectiveTarget } from '@/lib/targets';
import { formatWeight, kgToDisplay, unitLabel } from '@/lib/units';
import { ACTION_TONE } from '../../_components/action-tone';
import { shortDate } from '../../_components/today-model';
import { WhyButton } from '../../_components/WhyButton';

/** The call still in force: the newest one that is waiting on the coach or already accepted. */
function currentCall(recs: RecommendationDto[]): RecommendationDto | undefined {
  return recs
    .filter((r) => r.status === RecommendationStatus.PENDING || r.status === RecommendationStatus.ACCEPTED)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export default async function LiftDetailPage({ params }: { params: Promise<{ exerciseId: string }> }) {
  const { exerciseId } = await params;
  const user = await requireUser(Role.CLIENT);
  const unit = user.weightUnit;
  const history = await progressionApi.history(user.id, exerciseId).catch((err: unknown) => {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  });

  const { exercise, series, recommendations } = history;
  const rec = currentCall(recommendations);
  const t = rec ? effectiveTarget(rec) : null;
  const line = t
    ? formatTargetLine(
        { weightKg: t.weightKg === null ? null : toNumber(t.weightKg), repsMin: t.repsMin, repsMax: t.repsMax, rpe: t.rpe === null ? null : toNumber(t.rpe) },
        unit,
      )
    : '';
  const cap = rec?.settings?.rpeCap.value;
  const increment = rec?.settings?.loadIncrementKg.value;
  const last3 = series.slice(-3).reverse();
  const tone = rec ? ACTION_TONE[rec.action] : null;
  const tops = series.map((x) => x.topWeightKg);
  const rpes = series.slice(-8).flatMap((x) => (x.avgRpe === null ? [] : [x.avgRpe]));
  const stats: StatItem[] =
    series.length === 0
      ? []
      : [
          { label: 'Best top set', value: formatWeight(Math.max(...tops), unit), emphasis: true },
          { label: 'Last top set', value: formatWeight(tops[tops.length - 1] ?? 0, unit) },
          { label: 'Sessions', value: String(series.length) },
          { label: 'Avg RPE', value: rpes.length ? formatStepValue('rpe', rpes.reduce((a, b) => a + b, 0) / rpes.length) : '—' },
        ];

  return (
    <>
      <PageHeader title={exercise.name} back={{ href: '/client/history?tab=charts', label: 'Back to history' }} />
      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        {stats.length > 0 ? (
          <div className="lg:col-span-12">
            <StatStrip label="Lift stats" items={stats} />
          </div>
        ) : null}

        {rec && tone ? (
          <section
            aria-labelledby="next-target"
            className={clsx('space-y-3 rounded-md border p-6', ACTION_META[rec.action].box, last3.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12')}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="next-target" className="font-mono text-label-sm uppercase text-muted">
                Next Session Target
              </h2>
              <ActionBadge action={rec.action} />
            </div>
            <p className={clsx('font-mono text-metric-lg tabular-nums', tone.text)}>
              {line || <span className="font-sans text-body text-muted">Pick your own weight</span>}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-label-sm text-muted">
                {cap !== undefined ? `RPE cap ${formatStepValue('rpe', cap)}` : ''}
                {cap !== undefined && increment !== undefined ? ' · ' : ''}
                {increment !== undefined ? `step +${formatWeight(increment, unit)}` : ''}
              </p>
              <WhyButton
                recommendationId={rec.id}
                exerciseName={exercise.name}
                unit={unit}
                coachName={null}
                override={
                  rec.overriddenAt
                    ? {
                        weightKg: rec.overrideWeightKg,
                        repsMin: rec.overrideRepsMin,
                        repsMax: rec.overrideRepsMax,
                        rpe: rec.overrideRpe,
                        note: rec.overrideNote,
                        byName: null,
                        at: rec.overriddenAt,
                      }
                    : null
                }
              />
            </div>
            {rec.status === RecommendationStatus.PENDING ? (
              <p className="font-mono text-label-sm text-amber">Waiting for your coach to approve this change.</p>
            ) : null}
            <p className="max-w-prose text-ui text-ink">{rec.reason}</p>
          </section>
        ) : (
          <div className={last3.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'}>
            <EmptyState title="No target yet">Log this lift in a session and your next target shows up here.</EmptyState>
          </div>
        )}

        {last3.length > 0 ? (
          <Panel title={`Last ${last3.length === 1 ? 'session' : `${last3.length} sessions`}`} className="lg:col-span-5">
            <div className="relative overflow-x-auto">
              <table className={TABLE}>
                <caption className="sr-only">Recent sessions, newest first</caption>
                <thead className={THEAD}>
                  <tr>
                    <th scope="col" className={TH}>Date</th>
                    <th scope="col" className={TH_NUM}>Weight</th>
                    <th scope="col" className={TH_NUM}>Reps</th>
                    <th scope="col" className={TH_NUM}>RPE</th>
                  </tr>
                </thead>
                <tbody>
                  {last3.map((s) => (
                    <tr key={s.exerciseLogId} className={TR}>
                      <td className={`${TD} h-12 font-mono text-muted`}>{shortDate(s.performedAt)}</td>
                      <td className={`${TD_NUM} h-12`}>{`${formatStepValue('weight', kgToDisplay(s.topWeightKg, unit))} ${unitLabel(unit)}`}</td>
                      <td className={`${TD_NUM} h-12`}>{s.topSetReps}</td>
                      <td className={`${TD_NUM} h-12`}>{s.avgRpe === null ? '—' : formatStepValue('rpe', s.avgRpe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        ) : null}
      </div>
    </>
  );
}
