import { AlertTriangle } from 'lucide-react';
import type { ClientProgramConflictsDto } from '@coaching/shared';
import { LimitationBadge } from '@/components/limitations/LimitationBadge';
import { Icon } from '@/components/ui/Icon';

const SHOWN_PER_CLIENT = 6;

/**
 * Advisory: prescriptions that clash with clients' active limitations. Never blocks saving or assigning;
 * the client still sees the flag on Today and in the logger, and swaps sort safest first.
 */
export function ProgramConflicts({ conflicts, note }: { conflicts: ClientProgramConflictsDto[]; note?: string }) {
  if (conflicts.length === 0) return null;
  const total = conflicts.reduce((n, c) => n + c.conflicts.length, 0);
  return (
    <section role="status" aria-label="Limitation conflicts" className="space-y-3 border-l-2 border-l-amber bg-amber-bg px-4 py-3">
      <p className="flex items-center gap-2 text-ui font-medium text-amber">
        <Icon icon={AlertTriangle} />
        {total} {total === 1 ? 'prescription conflicts' : 'prescriptions conflict'} with client limitations
      </p>
      {note ? <p className="text-meta text-muted">{note}</p> : null}
      <ul className="space-y-3">
        {conflicts.map((c) => (
          <li key={c.clientId}>
            <p className="text-ui font-medium text-ink">{c.clientName}</p>
            <ul className="mt-1 space-y-1">
              {c.conflicts.slice(0, SHOWN_PER_CLIENT).map((x) => (
                <li key={`${x.workoutId}-${x.exerciseId}`} className="flex flex-wrap items-center gap-2 text-meta text-muted">
                  <span className="font-mono text-faint">
                    W{x.weekNumber} · D{x.dayNumber}
                  </span>
                  <span className="text-ink">{x.exerciseName}</span>
                  <span className="text-faint">{x.workoutName}</span>
                  <LimitationBadge flag={x.limitation} />
                </li>
              ))}
              {c.conflicts.length > SHOWN_PER_CLIENT ? (
                <li className="text-meta text-faint">and {c.conflicts.length - SHOWN_PER_CLIENT} more</li>
              ) : null}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
