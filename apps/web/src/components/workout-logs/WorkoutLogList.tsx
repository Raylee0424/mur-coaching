import type { WorkoutLogDto } from '@coaching/shared';
import { EmptyState } from '@/components/ui/EmptyState';
import { WorkoutLogCard } from './WorkoutLogCard';

export function WorkoutLogList({ logs }: { logs: WorkoutLogDto[] }) {
  if (logs.length === 0) return <EmptyState title="No sessions yet" />;
  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <WorkoutLogCard key={log.id} log={log} />
      ))}
    </div>
  );
}
