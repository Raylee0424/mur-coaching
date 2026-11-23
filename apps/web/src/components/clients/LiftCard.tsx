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

/** One engine card on the client's Lifts tab: last sessions, trend, the call and its actions. */
export function LiftCard({ rec, exerciseName, unit }: { rec: RecommendationDto; exerciseName: string; unit: WeightUnit }) {
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

  return (
    <article className={clsx('space-y-4 rounded-md border border-l-2 border-line bg-card p-4', ACTION_META[rec.action].rule, !pending && 'opacity-90')}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold">{exerciseName}</h3>
          <p className="text-sm text-muted tabular-nums">
            {last ? `Current: ${formatWeight(last.topWeightKg, unit)} × ${last.topSetReps}` : 'No sessions yet'}
            {cap !== undefined ? ` · RPE cap ${cap}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!pending ? (
            <Badge tone={STATUS[rec.status as keyof typeof STATUS].tone}>
              {STATUS[rec.status as keyof typeof STATUS].label}
              {rec.resolvedAt ? ` · ${formatDate(rec.resolvedAt)}` : ''}
            </Badge>
          ) : null}
          {eff.overridden ? <OverriddenTag /> : null}
          <ActionBadge action={rec.action} />
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[18rem] text-left text-sm">
            <caption className="sr-only">Last {recent.length} sessions, newest first</caption>
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th scope="col" className="py-1 pr-3 font-semibold">Date</th>
                <th scope="col" className="py-1 pr-3 font-semibold">Weight</th>
                <th scope="col" className="py-1 pr-3 font-semibold">Reps</th>
                <th scope="col" className="py-1 font-semibold">RPE</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {recent.map((m) => (
                <tr key={m.exerciseLogId} className="border-b border-line last:border-0">
                  <td className="py-1.5 pr-3">{formatDate(m.performedAt)}</td>
                  <td className="py-1.5 pr-3">{formatWeight(m.topWeightKg, unit)}</td>
                  <td className="py-1.5 pr-3">{m.topSetReps}</td>
                  <td className="py-1.5">{m.avgRpe === null ? '—' : formatRpe(m.avgRpe).replace('RPE ', '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {weights.length > 0 ? (
          <div className="flex flex-col items-start gap-1 sm:items-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Top-set trend</span>
            <Sparkline values={weights} tone={rec.action} label={`Top-set weight across ${weights.length} sessions: ${weights.map((w) => formatWeight(w, unit)).join(', ')}`} />
            {diff !== null && weights.length > 1 ? (
              <span className="text-xs tabular-nums text-muted">
                {diff > 0 ? '+' : diff < 0 ? '−' : ''}
                {formatWeight(Math.abs(diff), unit)} / {weights.length} sess
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-line pt-4">
        {target ? (
          <p className="font-display text-lg font-bold tabular-nums">
            Next: {target}
            {eff.overridden && eff.rpe ? <span className="ml-2 text-sm font-semibold text-muted">{formatRpe(eff.rpe)}</span> : null}
          </p>
        ) : null}
        <p className="text-sm">{rec.reason}</p>
        {rec.overrideNote ? (
          <p className="rounded-md bg-raised px-3 py-2 text-sm">
            <span className="font-semibold">Your note:</span> {rec.overrideNote}
          </p>
        ) : null}
        <div className="flex flex-wrap items-start justify-between gap-3 pt-1">
          {pending ? (
            <RecommendationActions clientId={rec.clientId} recommendationId={rec.id} exerciseId={rec.exerciseId} exerciseName={exerciseName} canDismiss />
          ) : (
            <span />
          )}
          <div className="flex flex-wrap gap-2">
            {editable ? <EditTargetButton recommendation={rec} exerciseName={exerciseName} unit={unit} /> : null}
            <WhyThisCall recommendation={rec} exerciseName={exerciseName} audience="coach" unit={unit} label="Why?" />
          </div>
        </div>
      </div>
    </article>
  );
}
