import type { SessionMetrics, WeightUnit } from '@coaching/shared';
import { formatDate, formatRpe } from '@/lib/format';
import { formatWeight } from '@/lib/units';

export function MetricsTable({ metrics, unit }: { metrics: SessionMetrics[]; unit: WeightUnit }) {
  if (metrics.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] text-left text-sm">
        <caption className="sr-only">Sessions the engine analysed, oldest first</caption>
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <th scope="col" className="py-1 pr-3 font-semibold">Date</th>
            <th scope="col" className="py-1 pr-3 font-semibold">Top set</th>
            <th scope="col" className="py-1 pr-3 font-semibold">e1RM</th>
            <th scope="col" className="py-1 pr-3 font-semibold">Avg RPE</th>
            <th scope="col" className="py-1 font-semibold">Volume</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.exerciseLogId} className="border-b border-line last:border-0">
              <td className="py-1.5 pr-3">{formatDate(m.performedAt)}</td>
              <td className="py-1.5 pr-3">
                {formatWeight(m.topWeightKg, unit)} × {m.topSetReps}
              </td>
              <td className="py-1.5 pr-3">{formatWeight(m.e1rmKg, unit)}</td>
              <td className="py-1.5 pr-3">{m.avgRpe === null ? '—' : formatRpe(m.avgRpe).replace('RPE ', '')}</td>
              <td className="py-1.5">{formatWeight(m.volumeKg, unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
