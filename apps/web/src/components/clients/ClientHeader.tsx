import Link from 'next/link';
import { CoachClientStatus } from '@coaching/shared';
import type { ClientView } from '@coaching/shared';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { programWeek } from '@/lib/format';

export function ClientHeader({ client }: { client: ClientView }) {
  const assignment = client.activeAssignment;
  return (
    <Card className="mb-6 space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
        <Badge tone={client.status === CoachClientStatus.ACTIVE ? 'emerald' : 'slate'}>
          {client.status === CoachClientStatus.ACTIVE ? 'Active' : 'Archived'}
        </Badge>
      </div>
      <p className="text-sm text-muted">{client.email}</p>
      <p className="text-sm">
        {assignment ? (
          <>
            <span className="font-semibold">{assignment.program.name}</span> · Week{' '}
            {programWeek(assignment.startDate, assignment.program.durationWeeks)} of {assignment.program.durationWeeks}
          </>
        ) : (
          <>
            No program assigned ·{' '}
            <Link href="/coach/programs" className="font-semibold text-primary-soft underline">
              Programs (coming soon)
            </Link>
          </>
        )}
      </p>
      {client.notes ? (
        <p className="rounded-md bg-raised px-3 py-2 text-sm text-ink">
          <span className="font-semibold">Coach notes:</span> {client.notes}
        </p>
      ) : null}
    </Card>
  );
}
