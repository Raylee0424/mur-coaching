import type { RecommendationDto, WeightUnit } from '@coaching/shared';
import { SheetButton } from '@/components/ui/Sheet';
import { formatTarget } from '@/lib/format';
import { ActionBadge } from './ActionBadge';
import { MetricsTable } from './MetricsTable';

/** Explains a recommendation: the engine's reason plus the sessions it analysed. */
export function WhyThisCall({
  recommendation: rec,
  exerciseName,
  audience,
  unit,
}: {
  recommendation: RecommendationDto;
  exerciseName: string;
  audience: 'coach' | 'client';
  unit: WeightUnit;
}) {
  const target = formatTarget(rec, unit);
  return (
    <SheetButton
      label="Why this call?"
      title={`Why this call: ${exerciseName}`}
      variant="drawer"
      buttonClassName="min-h-9 py-1"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <ActionBadge action={rec.action} />
          {target ? <span className="font-display text-2xl font-extrabold tabular">{target}</span> : null}
        </div>
        <section className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Reasoning</h3>
          <p className="text-sm">{rec.reason}</p>
        </section>
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Based on {rec.metrics.length} {rec.metrics.length === 1 ? 'session' : 'sessions'}
          </h3>
          <MetricsTable metrics={rec.metrics} unit={unit} />
        </section>
        <p className="rounded-md bg-raised p-3 text-sm text-muted">
          {audience === 'coach'
            ? 'Accept to confirm this target for the client, or dismiss it. Re-run the engine after new sessions are logged.'
            : 'This target comes from your logged sets. Accept it to lock it in for your next session.'}
        </p>
      </div>
    </SheetButton>
  );
}
