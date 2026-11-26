import clsx from 'clsx';
import { RecommendationStatus } from '@coaching/shared';
import type { RecommendationDto, WeightUnit } from '@coaching/shared';
import { Sparkline } from '@/components/charts/Sparkline';
import { ACTION_META, ActionBadge } from '@/components/progression/ActionBadge';
import { EditTargetButton } from '@/components/progression/EditTargetButton';
import { RecommendationActions } from '@/components/progression/RecommendationActions';
import { WhyThisCall } from '@/components/progression/WhyThisCall';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { OverriddenTag } from '@/components/ui/OverrideField';
import { formatDate, formatRpe, formatTarget } from '@/lib/format';
import { asTargetFields, effectiveTarget } from '@/lib/targets';
import { formatWeight } from '@/lib/units';

const STATUS: Record<Exclude<RecommendationStatus, 'PENDING'>, { label: string; tone: BadgeTone }> = {
  ACCEPTED: { label: 'Accepted', tone: 'emerald' },
  DISMISSED: { label: 'Dismissed', tone: 'slate' },
  SUPERSEDED: { label: 'Superseded', tone: 'slate' },
};

/** Stitch exercise engine card (`coach_client_detail`): header + badge, 3-session table + sparkline, tinted verdict banner, and actions. */
export function LiftCard({ rec, exerciseName, unit }: { rec: RecommendationDto; exerciseName: string; unit: WeightUnit }) {
  const meta = ACTION_META[rec.action];
  const last = rec.metrics[rec.metrics.length - 1];
  const recent = [...rec.metrics].reverse().slice(0, 3);
  const weights = rec.metrics.map((m) => m.topWeightKg);
  const first = weights[0];
  const lastW = weights[weights.length - 1];
  const diff = first !== undefined && lastW !== undefined ? Math.round((lastW - first) * 100) / 100 : null;
  const pending = rec.status === RecommendationStatus.PENDING;
  const eff = effectiveTarget(rec);
  const target = formatTarget(eff.overridden ? asTargetFields(eff) : rec, unit);
  const cap = rec.settings?.rpeCap.value;
  const editable = pending || rec.status === RecommendationStatus.ACCEPTED;
  const status = pending ? null : STATUS[rec.status as keyof typeof STATUS];

  return (
    <article className="flex flex-col gap-5 rounded-md border border-line bg-card p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-title-lg text-ink">{exerciseName}</h3>
          <p className="mt-0.5 font-sans text-label-sm text-muted tabular-nums">
            Current: {last ? `${formatWeight(last.topWeightKg, unit)} × ${last.topSetReps}` : 'No sessions yet'}
            {cap !== undefined ? ` · RPE Cap ${cap}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ActionBadge action={rec.action} showCode />
          {status ? (
            <Badge tone={status.tone}>
              {status.label}
              {rec.resolvedAt ? ` · ${formatDate(rec.resolvedAt)}` : ''}
            </Badge>
          ) : null}
          {eff.overridden ? <OverriddenTag /> : null}
        </div>
      </header>

      <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-12">
        <div className="relative overflow-x-auto rounded-sm border border-line bg-canvas-low sm:col-span-8">
          <table className="w-full min-w-[16rem] border-collapse text-left tabular-nums">
            <caption className="sr-only">Last {recent.length} sessions, newest first</caption>
            <thead>
              <tr className="border-b border-line bg-card">
                <th scope="col" className="px-3.5 py-2 font-sans text-label-sm text-muted">Date</th>
                <th scope="col" className="px-3.5 py-2 text-right font-sans text-label-sm text-muted">Weight</th>
                <th scope="col" className="px-3.5 py-2 text-right font-sans text-label-sm text-muted">Reps</th>
                <th scope="col" className="px-3.5 py-2 text-right font-sans text-label-sm text-muted">RPE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {recent.map((m) => (
                <tr key={m.exerciseLogId}>
                  <td className="px-3.5 py-2 font-sans text-label-sm text-muted">{formatDate(m.performedAt)}</td>
                  <td className="px-3.5 py-2 text-right font-mono text-label-md text-ink">{formatWeight(m.topWeightKg, unit)}</td>
                  <td className="px-3.5 py-2 text-right font-mono text-label-md text-ink">{m.topSetReps}</td>
                  <td className="px-3.5 py-2 text-right font-mono text-label-md text-ink">
                    {m.avgRpe === null ? '—' : formatRpe(m.avgRpe).replace('RPE ', '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-center gap-1.5 rounded-sm border border-line bg-canvas-low p-3 sm:col-span-4">
          {weights.length > 0 ? (
            <>
              <Sparkline
                values={weights}
                tone={rec.action}
                label={`Top-set weight across ${weights.length} sessions: ${weights.map((w) => formatWeight(w, unit)).join(', ')}`}
              />
              {diff !== null && weights.length > 1 ? (
                <span className="font-mono text-label-sm text-muted tabular-nums">
                  {diff > 0 ? '+' : diff < 0 ? '−' : ''}
                  {formatWeight(Math.abs(diff), unit)} / {weights.length} sess
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-label-sm text-muted">No trend yet</span>
          )}
        </div>
      </div>

      <div className={clsx('flex flex-col gap-2 rounded-md border p-4', meta.box)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={clsx('font-sans text-label-sm uppercase tracking-wider', meta.text)}>NEXT SESSION TARGET</span>
          {target ? (
            <span className={clsx('font-display text-title-lg tabular-nums', meta.text)}>
              {target}
              {eff.overridden && eff.rpe ? <span className="ml-2 font-sans text-label-md text-ink/80">{formatRpe(eff.rpe)}</span> : null}
            </span>
          ) : null}
        </div>
        <p className="font-sans text-label-md font-normal text-ink">{rec.reason}</p>
        {rec.overrideNote ? (
          <p className="mt-1 border-l-2 border-primary pl-3 font-sans text-label-sm font-normal text-ink">
            <span className="font-semibold text-primary">Your note:</span> {rec.overrideNote}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <WhyThisCall recommendation={rec} exerciseName={exerciseName} audience="coach" unit={unit} label="Why?" />
          {editable ? <EditTargetButton recommendation={rec} exerciseName={exerciseName} unit={unit} /> : null}
        </div>
        {pending ? (
          <RecommendationActions clientId={rec.clientId} recommendationId={rec.id} exerciseId={rec.exerciseId} exerciseName={exerciseName} canDismiss />
        ) : null}
      </div>
    </article>
  );
}
