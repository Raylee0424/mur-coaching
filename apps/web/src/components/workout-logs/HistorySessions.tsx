import type { WeightUnit, WorkoutLogDto } from '@coaching/shared';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/format';
import { EditSetButton } from './EditSetButton';
import { SetLine, SetText } from './SetLine';

function Chevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** Sessions tab: one expandable card per session. The client's own sets open the edit sheet. */
export function HistorySessions({ logs, unit, editable = false }: { logs: WorkoutLogDto[]; unit: WeightUnit; editable?: boolean }) {
  if (logs.length === 0) return <EmptyState title="No sessions yet">Finish a workout and it shows up here.</EmptyState>;
  return (
    <div className="space-y-4">
      {logs.map((log, i) => {
        const sets = log.exerciseLogs.reduce((n, e) => n + e.sets.length, 0);
        return (
          <details key={log.id} open={i === 0} className="group rounded-lg border border-line bg-card p-4">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
              <div>
                <p className="font-display text-base font-bold">{formatDate(log.performedAt)}</p>
                <p className="text-xs text-muted tabular">
                  {log.exerciseLogs.length} {log.exerciseLogs.length === 1 ? 'exercise' : 'exercises'} · {sets} {sets === 1 ? 'set' : 'sets'}
                </p>
              </div>
              <Chevron />
            </summary>
            <div className="mt-3 space-y-3 border-t border-line pt-3">
              {log.notes ? <p className="text-sm text-muted">{log.notes}</p> : null}
              {log.exerciseLogs.map((el) => (
                <section key={el.id}>
                  <h3 className="font-sans text-sm font-semibold tracking-normal">{el.exercise.name}</h3>
                  {el.swappedFrom ? (
                    <p className="text-xs text-amber">
                      Swapped from {el.swappedFrom.name}
                      {el.swapReason ? ` · ${el.swapReason}` : ''}
                    </p>
                  ) : null}
                  <ul className="mt-1 tabular">
                    {el.sets.map((set) =>
                      editable ? (
                        <EditSetButton key={set.id} log={log} set={set} exerciseName={el.exercise.name} unit={unit}>
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
            </div>
          </details>
        );
      })}
    </div>
  );
}
