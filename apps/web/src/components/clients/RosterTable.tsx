import clsx from 'clsx';
import Link from 'next/link';
import { CoachClientStatus } from '@coaching/shared';
import type { ClientView } from '@coaching/shared';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/format';

export function RosterTable({ clients }: { clients: ClientView[] }) {
  if (clients.length === 0) {
    return <EmptyState title="No clients yet">Add your first client below.</EmptyState>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-card">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <caption className="sr-only">Your clients</caption>
        <thead className="border-b border-line bg-raised text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-4 py-2 font-semibold">Client</th>
            <th scope="col" className="px-4 py-2 font-semibold">Status</th>
            <th scope="col" className="px-4 py-2 font-semibold">Program</th>
            <th scope="col" className="px-4 py-2 font-semibold">Joined</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const archived = client.status === CoachClientStatus.ARCHIVED;
            return (
              <tr key={client.id} className={clsx('border-b border-line last:border-0', archived && 'text-muted')}>
                <td className="px-4 py-3">
                  <Link
                    href={`/coach/clients/${client.id}`}
                    className="font-semibold text-primary-soft underline-offset-2 hover:underline"
                  >
                    {client.name}
                  </Link>
                  <div className="text-xs text-muted">{client.email}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={archived ? 'slate' : 'emerald'}>{archived ? 'Archived' : 'Active'}</Badge>
                </td>
                <td className="px-4 py-3">{client.activeAssignment?.program.name ?? 'No program'}</td>
                <td className="px-4 py-3">{formatDate(client.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
