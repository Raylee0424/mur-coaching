import { ChevronDown } from 'lucide-react';
import type { WeightUnit, WorkoutLogDto } from '@coaching/shared';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { formatDate } from '@/lib/format';
import { EditSetButton } from './EditSetButton';
import { SetLine, SetText } from './SetLine';

/** Sessions tab: one card per session, expandable. The client's own sets open the edit sheet. */
export function HistorySessions({ logs, unit, editable = false }: { logs: WorkoutLogDto[]; unit: WeightUnit; editable?: boolean }) {
  if (logs.length === 0) return <EmptyState title="No sessions yet">Finish a workout and it shows up here.</EmptyState>;
  return (
    <div className="space-y-3">
      {logs.map((log, i) => {
        const sets = log.exerciseLogs.reduce((n, e) => n + e.sets.length, 0);
        return (
          <details key={log.id} open={i === 0} className="group overflow-hidden rounded-md border border-line bg-card">
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-4 px-5 py-3.5 hover:bg-raised/40 [&::-webkit-details-marker]:hidden">
              <span className="w-28 shrink-0 font-mono text-label-md text-primary">{formatDate(log.performedAt)}</span>
              <span className="min-w-0 flex-1 truncate font-sans text-ui text-ink">{log.exerciseLogs.map((e) => e.exercise.name).join(' · ')}</span>
              <span className="shrink-0 rounded-full border border-line bg-canvas-low px-2.5 py-0.5 font-mono text-label-sm text-muted">
                {sets} {sets === 1 ? 'set' : 'sets'}
              </span>
              <span className="text-muted transition-transform group-open:rotate-180">
                <Icon icon={ChevronDown} />
              </span>
            </summary>
            <div className="space-y-4 border-t border-line bg-canvas-low/40 px-5 py-4">
              {log.notes ? <p className="text-ui text-muted">{log.notes}</p> : null}
              {log.exerciseLogs.map((el) => (
                <section key={el.id}>
                  <h3 className="font-display text-title-md text-ink">{el.exercise.name}</h3>
                  {el.swappedFrom ? (
                    <p className="text-meta text-amber">
                      Swapped from {el.swappedFrom.name}
                      {el.swapReason ? ` · ${el.swapReason}` : ''}
                    </p>
                  ) : null}
                  <ul className="mt-1">
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
              {editable ? <p className="font-mono text-label-sm text-muted">Tap any set to edit or delete it.</p> : null}
            </div>
          </details>
        );
      })}
    </div>
  );
}
