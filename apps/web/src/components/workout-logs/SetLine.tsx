import clsx from 'clsx';
import type { SetLogDto } from '@coaching/shared';
import { formatKg, formatRpe } from '@/lib/format';

export function SetLine({ set }: { set: SetLogDto }) {
  const rpe = set.rpe === null ? '' : ` @ ${formatRpe(set.rpe)}`;
  return (
    <li className={clsx('text-sm', set.isWarmup && 'text-muted')}>
      {formatKg(set.weightKg)} × {set.reps}
      {rpe}
      {set.isWarmup ? <span className="ml-2 text-xs font-semibold uppercase">warm-up</span> : null}
    </li>
  );
}
