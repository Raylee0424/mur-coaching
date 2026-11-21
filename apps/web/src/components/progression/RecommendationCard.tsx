import clsx from 'clsx';
import Link from 'next/link';
import { RecommendationStatus } from '@coaching/shared';
import type { RecommendationDto } from '@coaching/shared';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { formatDate, formatTarget } from '@/lib/format';
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
}

export function RecommendationCard({ recommendation: rec, exerciseName, canDismiss, liftHref }: Props) {
  const target = formatTarget(rec);
  const pending = rec.status === RecommendationStatus.PENDING;
  return (
    <article
      className={clsx(
        'space-y-3 rounded-lg border border-l-4 border-line bg-card p-5 ',
        ACTION_META[rec.action].border,
        !pending && 'opacity-90',
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">
          {liftHref ? (
            <Link href={liftHref} className="hover:text-primary hover:underline">
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
          <ActionBadge action={rec.action} />
        </div>
      </header>
      {target ? <p className="text-lg font-bold">{target}</p> : null}
      <p className="text-sm text-ink">{rec.reason}</p>
      <MetricsTable metrics={rec.metrics} />
      <div className="flex flex-wrap items-start gap-3">
        {pending ? (
          <RecommendationActions
            clientId={rec.clientId}
            recommendationId={rec.id}
            exerciseId={rec.exerciseId}
            canDismiss={canDismiss}
          />
        ) : null}
        <WhyThisCall recommendation={rec} exerciseName={exerciseName} audience={canDismiss ? 'coach' : 'client'} />
      </div>
    </article>
  );
}
