import type { WeightUnit } from '@coaching/shared';
import { unitLabel } from '@/lib/units';
import { formatStepValue, setValuesOf, type DraftSet } from './logger-model';

/** Logged sets of the current exercise; each row opens the edit sheet. */
export function LoggedSets({ sets, unit, onEdit }: { sets: DraftSet[]; unit: WeightUnit; onEdit: (setKey: string) => void }) {
  if (sets.length === 0) return null;
  return (
    <section aria-labelledby="logged-sets" className="space-y-2.5">
      <h2 id="logged-sets" className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted">
        Logged sets
      </h2>
      <ul className="space-y-2.5 tabular">
        {sets.map((set, i) => {
          const v = setValuesOf(set);
          return (
            <li key={set.key}>
              <button
                type="button"
                onClick={() => onEdit(set.key)}
                aria-label={`Edit set ${i + 1}: ${formatStepValue('weight', v.weight)} ${unitLabel(unit)} for ${v.reps} reps at RPE ${formatStepValue('rpe', v.rpe)}`}
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-md border border-line bg-card px-4 py-3 text-left hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span className="flex items-center gap-2.5 text-sm font-semibold">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 text-primary" fill="currentColor">
                    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1.2 14.4-4-4 1.4-1.4 2.6 2.6 5-5 1.4 1.4-6.4 6.4z" />
                  </svg>
                  Set {i + 1} · {formatStepValue('weight', v.weight)} {unitLabel(unit)} × {v.reps}
                </span>
                <span className="text-xs text-muted">RPE {formatStepValue('rpe', v.rpe)} · Tap to edit</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
