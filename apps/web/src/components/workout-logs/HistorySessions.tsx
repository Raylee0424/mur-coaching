import { ChevronDown } from 'lucide-react';
import type { WeightUnit, WorkoutLogDto } from '@coaching/shared';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { formatDate } from '@/lib/format';
import { EditSetButton } from './EditSetButton';
import { SetLine, SetText } from './SetLine';

/** Sessions tab: one row per session, expandable. The client's own sets open the edit sheet. */
export function HistorySessions({ logs, unit, editable = false }: { logs: WorkoutLogDto[]; unit: WeightUnit; editable?: boolean }) {
  if (logs.length === 0) return <EmptyState title="No sessions yet">Finish a workout and it shows up here.</EmptyState>;
  return (
    <div className="divide-y divide-line border-y border-line">
      {logs.map((log, i) => {
        const sets = log.exerciseLogs.reduce((n, e) => n + e.sets.length, 0);
        return (
          <details key={log.id} open={i === 0} className="group">
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="w-24 shrink-0 font-mono text-ui">{formatDate(log.performedAt)}</span>
              <span className="min-w-0 flex-1 truncate text-ui text-muted">{log.exerciseLogs.map((e) => e.exercise.name).join(', ')}</span>
              <span className="shrink-0 font-mono text-meta text-faint">
                {sets} {sets === 1 ? 'set' : 'sets'}
              </span>
              <span className="text-faint transition-transform group-open:rotate-180">
                <Icon icon={ChevronDown} />
              </span>
            </summary>
            <div className="space-y-4 pb-4">
              {log.notes ? <p className="text-ui text-muted">{log.notes}</p> : null}
              {log.exerciseLogs.map((el) => (
                <section key={el.id}>
                  <h3 className="font-sans text-ui font-medium" style={{ fontStretch: '100%', letterSpacing: 0 }}>
                    {el.exercise.name}
                  </h3>
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
              {editable ? <p className="text-meta text-faint">Tap a set to fix it.</p> : null}
            </div>
          </details>
        );
      })}
    </div>
  );
}
