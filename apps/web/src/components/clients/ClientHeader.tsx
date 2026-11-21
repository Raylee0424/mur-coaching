import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ClientView } from '@coaching/shared';
import { CLIENT_STATUS_META as STATUS } from './status';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { programWeek } from '@/lib/format';

export function ClientHeader({ client, actions }: { client: ClientView; actions?: ReactNode }) {
  const assignment = client.activeAssignment;
  return (
    <Card className="mb-6 space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
        <Badge tone={STATUS[client.status].tone}>{STATUS[client.status].label}</Badge>
        {actions ? <div className="ml-auto">{actions}</div> : null}
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
              Assign a program
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
