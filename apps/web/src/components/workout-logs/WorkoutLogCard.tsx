import type { WorkoutLogDto } from '@coaching/shared';
import { Card } from '@/components/ui/Card';
import { formatDate } from '@/lib/format';
import { SetLine } from './SetLine';

export function WorkoutLogCard({ log }: { log: WorkoutLogDto }) {
  return (
    <Card className="space-y-3">
      <header>
        <h3 className="font-semibold">{formatDate(log.performedAt)}</h3>
        {log.notes ? <p className="mt-0.5 text-sm text-muted">{log.notes}</p> : null}
      </header>
      {log.exerciseLogs.map((exerciseLog) => (
        <section key={exerciseLog.id}>
          <h4 className="text-sm font-semibold">{exerciseLog.exercise.name}</h4>
          <ul className="mt-1 space-y-0.5">
            {exerciseLog.sets.map((set) => (
              <SetLine key={set.id} set={set} />
            ))}
          </ul>
        </section>
      ))}
    </Card>
  );
}
