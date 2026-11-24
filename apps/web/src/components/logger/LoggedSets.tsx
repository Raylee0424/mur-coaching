import clsx from 'clsx';
import { Check } from 'lucide-react';
import type { WeightUnit } from '@coaching/shared';
import { Icon } from '@/components/ui/Icon';
import { TABLE, TD, TD_NUM, TH, TH_NUM, THEAD, TR } from '@/components/ui/table';
import { unitLabel } from '@/lib/units';
import { formatStepValue, setValuesOf, type DraftSet } from './logger-model';

/** Logged sets of the current exercise; each row opens the edit sheet. */
export function LoggedSets({ sets, unit, onEdit }: { sets: DraftSet[]; unit: WeightUnit; onEdit: (setKey: string) => void }) {
  if (sets.length === 0) return null;
  return (
    <section aria-labelledby="logged-sets">
      <h2 id="logged-sets" className="mb-2 font-mono text-label-sm uppercase text-muted">
        Logged sets ({sets.length})
      </h2>
      <div className="overflow-hidden rounded-sm border border-line bg-canvas-low">
        <table className={TABLE}>
          <caption className="sr-only">Sets logged for this exercise. Select a row to edit it.</caption>
          <thead className={THEAD}>
            <tr>
              <th scope="col" className={TH}>Set #</th>
              <th scope="col" className={TH_NUM}>Weight ({unitLabel(unit)})</th>
              <th scope="col" className={TH_NUM}>Reps</th>
              <th scope="col" className={TH_NUM}>RPE</th>
              <th scope="col" className={TH_NUM}>Tempo</th>
              <th scope="col" className={TH_NUM}>Done</th>
            </tr>
          </thead>
          <tbody>
            {sets.map((set, i) => {
              const v = setValuesOf(set);
              return (
                <tr
                  key={set.key}
                  className={clsx(TR, 'cursor-pointer bg-emerald-bg/20')}
                  onClick={() => onEdit(set.key)}
                >
                  <td className={clsx(TD, 'h-12 font-mono text-muted')}>
                    <button
                      type="button"
                      aria-label={`Edit set ${i + 1}: ${formatStepValue('weight', v.weight)} ${unitLabel(unit)} for ${v.reps} reps at RPE ${formatStepValue('rpe', v.rpe)}`}
                      className="-mx-2 px-2 py-2 text-left"
                    >
                      {i + 1}
                    </button>
                  </td>
                  <td className={clsx(TD_NUM, 'h-12 font-semibold text-ink')}>
                    {formatStepValue('weight', v.weight)}
                    <span className="ml-1 font-normal text-muted">{unitLabel(unit)}</span>
                  </td>
                  <td className={clsx(TD_NUM, 'h-12 text-ink')}>{v.reps}</td>
                  <td className={clsx(TD_NUM, 'h-12 text-primary')}>{formatStepValue('rpe', v.rpe)}</td>
                  <td className={clsx(TD_NUM, 'h-12 text-muted')}>{set.tempo || '—'}</td>
                  <td className={clsx(TD_NUM, 'h-12')}>
                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-primary-ink" aria-hidden="true">
                      <Icon icon={Check} size={14} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
