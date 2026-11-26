import clsx from 'clsx';
import Link from 'next/link';
import { RecommendationStatus } from '@coaching/shared';
import type { RecommendationDto, WeightUnit } from '@coaching/shared';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { formatDate, formatRpe, formatTarget } from '@/lib/format';
import { asTargetFields, effectiveTarget } from '@/lib/targets';
import { OverriddenTag } from '@/components/ui/OverrideField';
import { EditTargetButton } from './EditTargetButton';
import { ACTION_META, ActionBadge } from './ActionBadge';
import { MetricsTable } from './MetricsTable';
import { WhyThisCall } from './WhyThisCall';
import { RecommendationActions } from './RecommendationActions';

const STATUS_META: Record<Exclude<RecommendationStatus, 'PENDING'>, { label: string; tone: BadgeTone }> = {
  ACCEPTED: { label: 'Accepted', tone: 'emerald' },
  DISMISSED: { label: 'Dismissed', tone: 'slate' },
  SUPERSEDED: { label: 'Superseded', tone: 'slate' },
};

interface Props {
  recommendation: RecommendationDto;
  exerciseName: string;
  /** True in the coach view (dismiss + re-evaluate); false for clients (accept only). */
  canDismiss: boolean;
  /** Client view: links the exercise name to its lift detail page. */
  liftHref?: string;
  unit: WeightUnit;
}

export function RecommendationCard({ recommendation: rec, exerciseName, canDismiss, liftHref, unit }: Props) {
  const engineTarget = formatTarget(rec, unit);
  const effective = effectiveTarget(rec);
  const target = effective.overridden ? formatTarget(asTargetFields(effective), unit) : engineTarget;
  const pending = rec.status === RecommendationStatus.PENDING;
  const coach = canDismiss;
  const editable = coach && (pending || rec.status === RecommendationStatus.ACCEPTED);
  return (
    <article
      className={clsx(
        'space-y-3 rounded-md border border-l-2 border-line bg-card p-4',
        ACTION_META[rec.action].rule,
        !pending && 'opacity-90',
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">
          {liftHref ? (
            <Link href={liftHref} className="hover:underline">
              {exerciseName}
            </Link>
          ) : (
            exerciseName
          )}
        </h3>
        <div className="flex items-center gap-2">
          {pending ? null : (
            <Badge tone={STATUS_META[rec.status as keyof typeof STATUS_META].tone}>
              {STATUS_META[rec.status as keyof typeof STATUS_META].label}
              {rec.resolvedAt ? ` · ${formatDate(rec.resolvedAt)}` : ''}
            </Badge>
          )}
          <ActionBadge action={rec.action} showCode />
        </div>
      </header>
      {effective.overridden ? (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <OverriddenTag />
            <span className="text-xs text-muted">
              {coach ? 'by you' : 'by your coach'}
              {rec.overriddenAt ? ` · ${formatDate(rec.overriddenAt)}` : ''}
            </span>
          </div>
          <p className="text-lg font-bold">
            {target}
            {effective.rpe ? <span className="ml-2 text-sm font-semibold text-muted">{formatRpe(effective.rpe)}</span> : null}
          </p>
          {engineTarget ? (
            <p className="text-sm text-muted">
              Engine: <s>{engineTarget}</s>
            </p>
          ) : null}
          {rec.overrideNote ? (
            <p className="rounded-md bg-raised px-3 py-2 text-sm">
              <span className="font-semibold">{coach ? 'Your note:' : 'Coach note:'}</span> {rec.overrideNote}
            </p>
          ) : null}
        </div>
      ) : target ? (
        <p className="text-lg font-bold">{target}</p>
      ) : null}
      {rec.autoApproved ? <p className="text-xs font-semibold text-emerald">Auto-approved by your rules</p> : null}
      <p className="text-sm text-ink">{rec.reason}</p>
      <MetricsTable metrics={rec.metrics} unit={unit} />
      <div className="flex flex-wrap items-start gap-3">
        {pending ? (
          <RecommendationActions
            clientId={rec.clientId}
            recommendationId={rec.id}
            exerciseId={rec.exerciseId}
            canDismiss={canDismiss}
            exerciseName={exerciseName}
          />
        ) : null}
        {editable ? <EditTargetButton recommendation={rec} exerciseName={exerciseName} unit={unit} /> : null}
        <WhyThisCall recommendation={rec} exerciseName={exerciseName} audience={canDismiss ? 'coach' : 'client'} unit={unit} />
      </div>
    </article>
  );
}
