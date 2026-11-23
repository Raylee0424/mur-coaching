import Link from 'next/link';
import { RecommendationStatus } from '@coaching/shared';
import type { CalendarDay, RecommendationAction, RecommendationDto, WeightUnit } from '@coaching/shared';
import { EvaluateAllButton } from '@/components/progression/EvaluateAllButton';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LiftCard } from './LiftCard';
import { shortDate } from './overview-model';

const PRIORITY: Record<RecommendationAction, number> = { DELOAD: 0, INCREASE_LOAD: 1, INCREASE_REPS: 2, HOLD: 3 };
const newestFirst = (a: RecommendationDto, b: RecommendationDto): number => b.createdAt.localeCompare(a.createdAt);

export function LiftsTab({
  clientId,
  recommendations,
  exerciseNames,
  next,
  programId,
  unit,
}: {
  clientId: string;
  recommendations: RecommendationDto[];
  exerciseNames: ReadonlyMap<string, string>;
  next: CalendarDay | null;
  programId: string | null;
  unit: WeightUnit;
}) {
  const pending = recommendations.filter((r) => r.status === RecommendationStatus.PENDING).sort((a, b) => PRIORITY[a.action] - PRIORITY[b.action] || newestFirst(a, b));
  const resolved = recommendations.filter((r) => r.status !== RecommendationStatus.PENDING).sort(newestFirst);
  const card = (r: RecommendationDto) => <LiftCard key={r.id} rec={r} exerciseName={exerciseNames.get(r.exerciseId) ?? 'Unknown exercise'} unit={unit} />;

  return (
    <div className="space-y-6">
      <section aria-label="Next session" className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="font-mono text-micro uppercase text-muted">
            {next ? `Next session · ${shortDate(next.date)}` : 'Next session'}
          </p>
          <p className="text-title font-semibold">{next?.workoutName ?? 'Nothing scheduled this month'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {programId ? (
            <Link href={`/coach/programs/${programId}`} className={buttonClass('secondary', undefined, 'sm')}>
              Edit program
            </Link>
          ) : null}
          <EvaluateAllButton clientId={clientId} />
        </div>
      </section>

      {pending.length === 0 ? (
        <EmptyState title="No pending recommendations">Recommendations appear once at least two sessions of a prescribed exercise are logged.</EmptyState>
      ) : (
        <div className="space-y-4">{pending.map(card)}</div>
      )}

      {resolved.length > 0 ? (
        <details className="rounded-md border border-line bg-card p-4">
          <summary className="cursor-pointer text-ui font-medium">Resolved <span className="font-mono text-faint">{resolved.length}</span></summary>
          <div className="mt-4 space-y-4">{resolved.map(card)}</div>
        </details>
      ) : null}
    </div>
  );
}
