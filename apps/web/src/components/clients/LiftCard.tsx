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
import { TABLE, TD, TD_NUM, TH, TH_NUM, THEAD, TR } from '@/components/ui/table';
import { formatDate, formatRpe, formatTarget } from '@/lib/format';
import { asTargetFields, effectiveTarget } from '@/lib/targets';
import { formatWeight } from '@/lib/units';

const STATUS: Record<Exclude<RecommendationStatus, 'PENDING'>, { label: string; tone: BadgeTone }> = {
  ACCEPTED: { label: 'Accepted', tone: 'emerald' },
  DISMISSED: { label: 'Dismissed', tone: 'slate' },
  SUPERSEDED: { label: 'Superseded', tone: 'slate' },
};

/** One engine card on the client's Lifts tab: last sessions and trend on the left, the call and its actions on the right. */
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
    <article className={clsx('grid rounded-md border border-l-2 border-line bg-card lg:grid-cols-[minmax(0,1fr)_280px]', meta.rule)}>
      <div className="min-w-0 space-y-4 p-4">
        <header>
          <h3 className="font-display text-title font-semibold">{exerciseName}</h3>
          <p className="font-mono text-meta text-muted">
            {last ? `${formatWeight(last.topWeightKg, unit)} × ${last.topSetReps}` : 'No sessions yet'}
            {cap !== undefined ? ` · cap ${cap}` : ''}
          </p>
        </header>

        <div className="overflow-x-auto rounded-md border border-line">
          <table className={clsx(TABLE, 'min-w-[18rem]')}>
            <caption className="sr-only">Last {recent.length} sessions, newest first</caption>
            <thead className={THEAD}>
              <tr>
                <th scope="col" className={TH}>Date</th>
                <th scope="col" className={TH_NUM}>Weight</th>
                <th scope="col" className={TH_NUM}>Reps</th>
                <th scope="col" className={TH_NUM}>RPE</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((m) => (
                <tr key={m.exerciseLogId} className={TR}>
                  <td className={clsx(TD, 'h-9 font-mono')}>{formatDate(m.performedAt)}</td>
                  <td className={clsx(TD_NUM, 'h-9')}>{formatWeight(m.topWeightKg, unit)}</td>
                  <td className={clsx(TD_NUM, 'h-9')}>{m.topSetReps}</td>
                  <td className={clsx(TD_NUM, 'h-9')}>{m.avgRpe === null ? '—' : formatRpe(m.avgRpe).replace('RPE ', '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {weights.length > 0 ? (
          <div className="flex items-center gap-4">
            <div className="rounded border border-line bg-canvas-low px-3 py-2">
              <Sparkline
                values={weights}
                tone={rec.action}
                label={`Top-set weight across ${weights.length} sessions: ${weights.map((w) => formatWeight(w, unit)).join(', ')}`}
              />
            </div>
            {diff !== null && weights.length > 1 ? (
              <span className="font-mono text-meta text-muted">
                {diff > 0 ? '+' : diff < 0 ? '−' : ''}
                {formatWeight(Math.abs(diff), unit)} / {weights.length} sess
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-3 border-t border-line p-4 lg:border-l lg:border-t-0">
        <p className="font-mono text-micro uppercase text-muted">Next session</p>
        {target ? (
          <p className={clsx('font-mono text-metric', meta.text)}>
            {target}
            {eff.overridden && eff.rpe ? <span className="ml-2 text-ui text-muted">{formatRpe(eff.rpe)}</span> : null}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <ActionBadge action={rec.action} />
          {status ? (
            <Badge tone="slate">
              {status.label}
              {rec.resolvedAt ? ` · ${formatDate(rec.resolvedAt)}` : ''}
            </Badge>
          ) : null}
          {eff.overridden ? <OverriddenTag /> : null}
        </div>
        <p className="text-meta">{rec.reason}</p>
        {rec.overrideNote ? (
          <p className="border-l-2 border-l-ink pl-3 text-meta">
            <span className="font-medium">Your note:</span> {rec.overrideNote}
          </p>
        ) : null}
        <div className="flex flex-col items-start gap-1 pt-1">
          {pending ? (
            <RecommendationActions clientId={rec.clientId} recommendationId={rec.id} exerciseId={rec.exerciseId} exerciseName={exerciseName} canDismiss stacked />
          ) : null}
          {editable ? <EditTargetButton recommendation={rec} exerciseName={exerciseName} unit={unit} /> : null}
          <WhyThisCall recommendation={rec} exerciseName={exerciseName} audience="coach" unit={unit} label="Why" />
        </div>
      </div>
    </article>
  );
}
