import clsx from 'clsx';
import type { LiveSetDto, WeightUnit } from '@coaching/shared';
import { Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatRpe } from '@/lib/format';
import { formatWeight } from '@/lib/units';
import type { QueuedSet } from './live-model';

/** Stitch real-time athlete set cards (`coach_web_train_together_live_in_person`). Newest first. */
export function LiveFeed({
  sets,
  queued = [],
  unit,
  onRemove,
  busy,
}: {
  sets: LiveSetDto[];
  queued?: QueuedSet[];
  unit: WeightUnit;
  onRemove?: (s: LiveSetDto) => void;
  busy?: boolean;
}) {
  if (sets.length === 0 && queued.length === 0) {
    return (
      <p className="rounded-sm border border-dashed border-line bg-canvas-low px-4 py-8 text-center font-sans text-body-md text-muted">
        No sets logged in this session yet.
      </p>
    );
  }

  const reversed = [...sets].reverse();
  return (
    <ol className="flex flex-col gap-3" aria-live="polite" aria-label="Logged sets, newest first">
      {[...queued].reverse().map((q) => (
        <li key={q.requestId} className="flex items-center justify-between gap-4 rounded-sm border border-amber/40 bg-canvas-low p-4">
          <div className="min-w-0 flex-1">
            <span className="font-sans text-label-sm uppercase text-amber">QUEUED OFFLINE</span>
            <p className="mt-0.5 font-display text-title-md text-ink">
              {q.exerciseName} — {formatWeight(q.weightKg, unit)} × {q.reps}
            </p>
            <p className="mt-0.5 font-mono text-label-sm text-muted">
              {q.rpe ? formatRpe(q.rpe) : 'No RPE'}
              {q.cue ? ` · ${q.cue}` : ''}
            </p>
          </div>
          <Badge tone="amber">Queued</Badge>
        </li>
      ))}

      {reversed.map((s, idx) => {
        const latest = idx === 0 && queued.length === 0;
        return (
          <li
            key={s.setLogId}
            className={clsx(
              'flex items-center justify-between gap-4 rounded-sm border bg-canvas-low p-4',
              latest ? 'border-primary/40' : 'border-line',
            )}
          >
            <div className="min-w-0 flex-1">
              <span className={clsx('font-sans text-label-sm uppercase', latest ? 'text-primary' : 'text-muted')}>
                {latest ? `LATEST · SET ${s.setNumber}` : `SET ${s.setNumber}`}
              </span>
              <p className="mt-0.5 font-display text-title-md text-ink">
                {s.exerciseName} — {formatWeight(s.weightKg, unit)} × {s.reps}
              </p>
              <p className="mt-0.5 font-mono text-label-sm text-muted">
                {s.rpe ? formatRpe(s.rpe) : 'No RPE'}
                {s.cue ? ` · Cue: ${s.cue}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone="emerald">Logged</Badge>
              {onRemove ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-8 px-0"
                  onClick={() => onRemove(s)}
                  disabled={busy}
                  aria-label={`Undo ${s.exerciseName} set ${s.setNumber}`}
                >
                  <Icon icon={Undo2} />
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
