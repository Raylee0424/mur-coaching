import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RecommendationStatus, Role } from '@coaching/shared';
import type { RecommendationDto } from '@coaching/shared';
import { formatStepValue, formatTargetLine } from '@/components/logger/logger-model';
import { ActionBadge } from '@/components/progression/ActionBadge';
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

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <header className="flex items-center gap-3 border-b border-line pb-4">
        <Link
          href="/client/history?tab=charts"
          aria-label="Back to history"
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-md border border-line bg-card hover:bg-raised"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5m6-6-6 6 6 6" />
          </svg>
        </Link>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Lift telemetry</p>
          <h1 className="break-words font-display text-xl font-bold">{exercise.name}</h1>
        </div>
      </header>

      {rec && tone ? (
        <section aria-labelledby="next-target" className="space-y-4 rounded-lg border border-line bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 id="next-target" className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted">
              Next target
            </h2>
            <ActionBadge action={rec.action} />
          </div>
          <p className="font-display text-3xl font-extrabold text-primary tabular">{line || 'Pick your own weight'}</p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted tabular">
              {cap !== undefined ? `RPE Cap: ${formatStepValue('rpe', cap)}` : ''}
              {cap !== undefined && increment !== undefined ? ' · ' : ''}
              {increment !== undefined ? `Increment: +${formatWeight(increment, unit)}` : ''}
            </p>
            <WhyButton
              recommendationId={rec.id}
              exerciseName={exercise.name}
              unit={unit}
              coachName={null}
              className="text-sm text-primary"
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
            <p className="text-xs font-semibold text-amber">Waiting for your coach to approve this change.</p>
          ) : null}
          <div className={`rounded-md border p-3.5 ${tone.box}`}>
            <p className="text-sm">{rec.reason}</p>
          </div>
        </section>
      ) : (
        <EmptyState title="No target yet">Log this lift in a session and your next target shows up here.</EmptyState>
      )}

      {last3.length > 0 ? (
        <section aria-labelledby="last-3" className="overflow-hidden rounded-lg border border-line bg-card">
          <div className="border-b border-line px-4 py-3">
            <h2 id="last-3" className="font-sans text-base font-bold tracking-normal">
              Last {last3.length === 1 ? 'Session' : `${last3.length} Sessions`}
            </h2>
          </div>
          <table className="w-full border-collapse text-left tabular">
            <thead>
              <tr className="border-b border-line bg-canvas-low">
                {['Date', 'Weight', 'Reps', 'RPE'].map((h) => (
                  <th key={h} scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {last3.map((s) => (
                <tr key={s.exerciseLogId}>
                  <td className="px-4 py-3 text-sm text-muted">{shortDate(s.performedAt)}</td>
                  <td className="px-4 py-3 text-sm">{`${formatStepValue('weight', kgToDisplay(s.topWeightKg, unit))} ${unitLabel(unit)}`}</td>
                  <td className="px-4 py-3 text-sm">{s.topSetReps}</td>
                  <td className="px-4 py-3 text-sm">{s.avgRpe === null ? '—' : formatStepValue('rpe', s.avgRpe)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
