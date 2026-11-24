import { ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import type { WeightUnit, WorkoutLogDto } from '@coaching/shared';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { formatDate } from '@/lib/format';
import { EditSetButton } from './EditSetButton';
import { SetLine, SetText } from './SetLine';

/** `editable`: the client's own history, where each set opens the edit sheet. */
export function WorkoutLogCard({ log, unit, editable = false, reviewHref }: { log: WorkoutLogDto; unit: WeightUnit; editable?: boolean; reviewHref?: string }) {
  return (
    <Card className="space-y-3 p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-mono text-ui">{formatDate(log.performedAt)}</h3>
          {log.loggedById ? <p className="font-mono text-micro uppercase text-signal">Logged by coach</p> : null}
          {log.notes ? <p className="mt-0.5 text-meta text-muted">{log.notes}</p> : null}
        </div>
        {reviewHref ? (
          <Link href={reviewHref} className={buttonClass('secondary', 'shrink-0', 'sm')}>
            <Icon icon={ClipboardCheck} />
            Review
          </Link>
        ) : null}
      </header>
      {log.exerciseLogs.map((exerciseLog) => (
        <section key={exerciseLog.id}>
          <h4 className="text-ui font-medium">{exerciseLog.exercise.name}</h4>
          {exerciseLog.swappedFrom ? (
            <p className="text-meta text-amber">
              Swapped from {exerciseLog.swappedFrom.name}
              {exerciseLog.swapReason ? ` · ${exerciseLog.swapReason}` : ''}
            </p>
          ) : null}
          <ul className="mt-1">
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
      {editable ? <p className="text-meta text-faint">Tap a set to fix it.</p> : null}
    </Card>
  );
}
