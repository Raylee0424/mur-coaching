import { AlertTriangle, Ban } from 'lucide-react';
import { LIMITATION_SEVERITY_LABELS } from '@coaching/shared';
import type { LimitationFlag } from '@coaching/shared';
import { Badge } from '@/components/ui/Badge';

/** Advisory marker only: it never blocks logging. */
export function LimitationBadge({ flag }: { flag: Pick<LimitationFlag, 'severity' | 'note'> }) {
  const avoid = flag.severity === 'AVOID';
  return (
    <span title={flag.note ?? undefined} className="inline-flex">
      <Badge tone={avoid ? 'red' : 'amber'} icon={avoid ? Ban : AlertTriangle}>
        {LIMITATION_SEVERITY_LABELS[flag.severity]}
        <span className="sr-only"> limitation{flag.note ? `: ${flag.note}` : ''}</span>
      </Badge>
    </span>
  );
}
