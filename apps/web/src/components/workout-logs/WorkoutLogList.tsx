import type { WeightUnit, WorkoutLogDto } from '@coaching/shared';
import { EmptyState } from '@/components/ui/EmptyState';
import { WorkoutLogCard } from './WorkoutLogCard';

export function WorkoutLogList({
  logs,
  unit,
  editable = false,
  reviewBase,
}: {
  logs: WorkoutLogDto[];
  unit: WeightUnit;
  editable?: boolean;
  /** Coach view: each session links to `<reviewBase>/<logId>`. */
  reviewBase?: string;
}) {
  if (logs.length === 0) return <EmptyState title="No sessions yet" />;
  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <WorkoutLogCard key={log.id} log={log} unit={unit} editable={editable} {...(reviewBase ? { reviewHref: `${reviewBase}/${log.id}` } : {})} />
      ))}
    </div>
  );
}
