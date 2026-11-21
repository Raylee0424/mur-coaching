import { RecommendationStatus } from '@coaching/shared';
import type { RecommendationAction, RecommendationDto } from '@coaching/shared';
import { EmptyState } from '@/components/ui/EmptyState';
import { RecommendationCard } from './RecommendationCard';

interface Props {
  recommendations: RecommendationDto[];
  exerciseNames: ReadonlyMap<string, string>;
  canDismiss: boolean;
  /** Builds a lift-detail link per exercise (client view). */
  liftHref?: (exerciseId: string) => string;
}

const newestFirst = (a: RecommendationDto, b: RecommendationDto): number => b.createdAt.localeCompare(a.createdAt);

/** Deloads need attention first, holds last. */
const ACTION_PRIORITY: Record<RecommendationAction, number> = {
  DELOAD: 0,
  INCREASE_LOAD: 1,
  INCREASE_REPS: 2,
  HOLD: 3,
};
const byPriority = (a: RecommendationDto, b: RecommendationDto): number =>
  ACTION_PRIORITY[a.action] - ACTION_PRIORITY[b.action] || newestFirst(a, b);

/** Pending cards first; resolved and superseded ones collapse underneath. */
export function RecommendationList({ recommendations, exerciseNames, canDismiss, liftHref }: Props) {
  const pending = recommendations.filter((r) => r.status === RecommendationStatus.PENDING).sort(byPriority);
  const resolved = recommendations.filter((r) => r.status !== RecommendationStatus.PENDING).sort(newestFirst);

  const card = (rec: RecommendationDto) => (
    <RecommendationCard
      key={rec.id}
      recommendation={rec}
      exerciseName={exerciseNames.get(rec.exerciseId) ?? 'Unknown exercise'}
      canDismiss={canDismiss}
      {...(liftHref ? { liftHref: liftHref(rec.exerciseId) } : {})}
    />
  );

  return (
    <div className="space-y-4">
      {pending.length === 0 ? (
        <EmptyState title="No pending recommendations">
          Recommendations appear once at least two sessions of a prescribed exercise are logged.
        </EmptyState>
      ) : (
        pending.map(card)
      )}
      {resolved.length > 0 ? (
        <details className="rounded-lg border border-line bg-card p-4">
          <summary className="cursor-pointer text-sm font-semibold">Resolved ({resolved.length})</summary>
          <div className="mt-4 space-y-4">{resolved.map(card)}</div>
        </details>
      ) : null}
    </div>
  );
}
