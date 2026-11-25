import { RotateCcw, Trophy } from 'lucide-react';
import Link from 'next/link';
import type { WeightUnit, WorkoutLogDto } from '@coaching/shared';
import { formatDeltaWeight } from '@/components/records/records-model';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Term } from '@/components/ui/Term';
import { formatDate } from '@/lib/format';
import { EditSetButton } from './EditSetButton';
import { SetLine, SetText } from './SetLine';
import { formatVolume, lastTimeDeltaKg, sessionTitle, sessionVolumeKg, workingSetCount } from './history-model';

/**
 * Right pane: one session with its sets. `history` (newest first) backs the "vs last time" badges; a lift
 * whose previous session is not loaded shows no badge. Duration is not recorded, so it is not shown.
 */
export function HistorySessionDetail({
  log,
  history,
  unit,
  editable,
}: {
  log: WorkoutLogDto;
  history: readonly WorkoutLogDto[];
  unit: WeightUnit;
  editable: boolean;
}) {
  const sets = workingSetCount(log);
  return (
    <section aria-labelledby="session-title" className="rounded-md border border-line bg-card">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="font-mono text-label-md text-primary">{formatDate(log.performedAt)}</p>
          <h2 id="session-title" className="text-balance break-words font-display text-headline-md text-ink">
            {sessionTitle(log)}
          </h2>
          <p className="mt-1 font-mono text-label-md text-muted tabular-nums">
            {sets} working {sets === 1 ? 'set' : 'sets'} · <Term id="volume" /> {formatVolume(sessionVolumeKg(log), unit)}
          </p>
        </div>
        <Link href={`/client/log?repeat=${encodeURIComponent(log.id)}`} className={buttonClass('primary', undefined, 'md')}>
          <Icon icon={RotateCcw} />
          Repeat Session
        </Link>
      </header>

      <div className="space-y-5 px-5 py-4 sm:px-6">
        {log.notes ? <p className="max-w-prose text-ui text-muted">{log.notes}</p> : null}
        {log.exerciseLogs.map((el) => {
          const delta = lastTimeDeltaKg(log, el.exerciseId, history);
          const pr = el.sets.some((s) => s.personalRecord !== null);
          return (
            <section key={el.id} aria-labelledby={`ex-${el.id}`}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 id={`ex-${el.id}`} className="font-display text-title-md text-ink">
                  {el.exercise.name}
                </h3>
                {pr ? (
                  <Badge tone="signal" icon={Trophy}>
                    PR
                  </Badge>
                ) : null}
                {delta ? <Badge tone={delta > 0 ? 'emerald' : 'slate'}>{`${formatDeltaWeight(delta, unit)} vs last time`}</Badge> : null}
              </div>
              {el.swappedFrom ? (
                <p className="text-meta text-amber">
                  Swapped from {el.swappedFrom.name}
                  {el.swapReason ? ` · ${el.swapReason}` : ''}
                </p>
              ) : null}
              <ul className="mt-1">
                {el.sets.map((set) => {
                  const text = (
                    <>
                      <span className="mr-2 w-14 shrink-0 font-mono text-label-md text-muted">Set {set.setNumber}</span>
                      <SetText set={set} unit={unit} />
                    </>
                  );
                  return editable ? (
                    <EditSetButton key={set.id} log={log} set={set} exerciseName={el.exercise.name} unit={unit}>
                      {text}
                    </EditSetButton>
                  ) : (
                    <SetLine key={set.id} set={set} unit={unit} />
                  );
                })}
              </ul>
            </section>
          );
        })}
        {editable ? <p className="font-mono text-label-sm text-muted">Tap any set to edit or delete it.</p> : null}
      </div>
    </section>
  );
}
