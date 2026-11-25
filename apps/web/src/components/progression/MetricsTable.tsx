import clsx from 'clsx';
import type { SessionMetrics, WeightUnit } from '@coaching/shared';
import { TABLE, TD, TD_NUM, TH, TH_NUM, THEAD, TR } from '@/components/ui/table';
import { formatDate, formatRpe } from '@/lib/format';
import { formatWeight } from '@/lib/units';

export function MetricsTable({ metrics, unit }: { metrics: SessionMetrics[]; unit: WeightUnit }) {
  if (metrics.length === 0) return null;
  return (
    <div className="relative overflow-x-auto rounded-md border border-line">
      <table className={clsx(TABLE, 'min-w-[28rem]')}>
        <caption className="sr-only">Sessions the engine analysed, oldest first</caption>
        <thead className={THEAD}>
          <tr>
            <th scope="col" className={TH}>Date</th>
            <th scope="col" className={TH_NUM}>Top set</th>
            <th scope="col" className={TH_NUM}>e1RM</th>
            <th scope="col" className={TH_NUM}>Avg RPE</th>
            <th scope="col" className={TH_NUM}>Volume</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.exerciseLogId} className={TR}>
              <td className={clsx(TD, 'font-mono')}>{formatDate(m.performedAt)}</td>
              <td className={TD_NUM}>
                {formatWeight(m.topWeightKg, unit)} × {m.topSetReps}
              </td>
              <td className={TD_NUM}>{formatWeight(m.e1rmKg, unit)}</td>
              <td className={TD_NUM}>{m.avgRpe === null ? '—' : formatRpe(m.avgRpe).replace('RPE ', '')}</td>
              <td className={TD_NUM}>{formatWeight(m.volumeKg, unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
