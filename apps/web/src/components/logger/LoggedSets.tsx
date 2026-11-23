import clsx from 'clsx';
import type { WeightUnit } from '@coaching/shared';
import { TABLE, TD, TD_NUM, TH, TH_NUM, THEAD, TR } from '@/components/ui/table';
import { unitLabel } from '@/lib/units';
import { formatStepValue, setValuesOf, type DraftSet } from './logger-model';

/** Logged sets of the current exercise; each row opens the edit sheet. */
export function LoggedSets({ sets, unit, onEdit }: { sets: DraftSet[]; unit: WeightUnit; onEdit: (setKey: string) => void }) {
  if (sets.length === 0) return null;
  return (
    <section aria-labelledby="logged-sets">
      <h2 id="logged-sets" className="mb-2 font-mono text-micro uppercase text-muted" style={{ fontStretch: '100%', letterSpacing: '0.06em' }}>
        Logged sets
      </h2>
      <div className="overflow-hidden rounded-md border border-line">
        <table className={TABLE}>
          <caption className="sr-only">Sets logged for this exercise. Select a row to edit it.</caption>
          <thead className={THEAD}>
            <tr>
              <th scope="col" className={TH}>Set</th>
              <th scope="col" className={TH_NUM}>Load</th>
              <th scope="col" className={TH_NUM}>Reps</th>
              <th scope="col" className={TH_NUM}>RPE</th>
            </tr>
          </thead>
          <tbody>
            {sets.map((set, i) => {
              const v = setValuesOf(set);
              return (
                <tr
                  key={set.key}
                  className={clsx(TR, 'cursor-pointer')}
                  onClick={() => onEdit(set.key)}
                >
                  <td className={clsx(TD, 'h-12 font-mono text-faint')}>
                    <button
                      type="button"
                      aria-label={`Edit set ${i + 1}: ${formatStepValue('weight', v.weight)} ${unitLabel(unit)} for ${v.reps} reps at RPE ${formatStepValue('rpe', v.rpe)}`}
                      className="-mx-2 px-2 py-2 text-left"
                    >
                      {i + 1}
                    </button>
                  </td>
                  <td className={clsx(TD_NUM, 'h-12')}>
                    {formatStepValue('weight', v.weight)}
                    <span className="ml-1 text-faint">{unitLabel(unit)}</span>
                  </td>
                  <td className={clsx(TD_NUM, 'h-12')}>{v.reps}</td>
                  <td className={clsx(TD_NUM, 'h-12')}>{formatStepValue('rpe', v.rpe)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
