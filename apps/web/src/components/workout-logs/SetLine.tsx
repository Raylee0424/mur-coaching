import clsx from 'clsx';
import type { SetLogDto, WeightUnit } from '@coaching/shared';
import { formatRpe } from '@/lib/format';
import { formatWeight } from '@/lib/units';

/** "100 kg × 8 @ RPE 8", warm-ups muted. */
export function SetText({ set, unit }: { set: SetLogDto; unit: WeightUnit }) {
  const rpe = set.rpe === null ? '' : ` @ ${formatRpe(set.rpe)}`;
  return (
    <span className={clsx('font-mono text-ui', set.isWarmup && 'text-muted')}>
      {formatWeight(set.weightKg, unit)} × {set.reps}
      {rpe}
      {set.isWarmup ? <span className="ml-2 text-micro uppercase text-faint">warm-up</span> : null}
    </span>
  );
}

export function SetLine({ set, unit }: { set: SetLogDto; unit: WeightUnit }) {
  return (
    <li className="py-0.5">
      <SetText set={set} unit={unit} />
    </li>
  );
}
