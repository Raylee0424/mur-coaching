import type { WeightUnit, WorkoutLogDto } from '@coaching/shared';
import { Card } from '@/components/ui/Card';
import { formatDate } from '@/lib/format';
import { EditSetButton } from './EditSetButton';
import { SetLine, SetText } from './SetLine';

/** `editable`: the client's own history, where each set opens the edit sheet. */
export function WorkoutLogCard({ log, unit, editable = false }: { log: WorkoutLogDto; unit: WeightUnit; editable?: boolean }) {
  return (
    <Card className="space-y-3">
      <header>
        <h3 className="font-semibold">{formatDate(log.performedAt)}</h3>
        {log.notes ? <p className="mt-0.5 text-sm text-muted">{log.notes}</p> : null}
      </header>
      {log.exerciseLogs.map((exerciseLog) => (
        <section key={exerciseLog.id}>
          <h4 className="text-sm font-semibold">{exerciseLog.exercise.name}</h4>
          {exerciseLog.swappedFrom ? (
            <p className="text-xs text-amber">
              Swapped from {exerciseLog.swappedFrom.name}
              {exerciseLog.swapReason ? ` · ${exerciseLog.swapReason}` : ''}
            </p>
          ) : null}
          <ul className="mt-1 space-y-0.5">
            {exerciseLog.sets.map((set) =>
              editable ? (
                <EditSetButton key={set.id} log={log} set={set} exerciseName={exerciseLog.exercise.name} unit={unit}>
                  <SetText set={set} unit={unit} />
                </EditSetButton>
              ) : (
                <SetLine key={set.id} set={set} unit={unit} />
              ),
            )}
          </ul>
        </section>
      ))}
      {editable ? <p className="text-xs text-muted">Tap a set to fix it.</p> : null}
    </Card>
  );
}
