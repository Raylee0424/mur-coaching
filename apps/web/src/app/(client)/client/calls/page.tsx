import { Role } from '@coaching/shared';
import { ClientBooking } from '@/components/calls/ClientBooking';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { callsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

export default async function ClientCallsPage() {
  await requireUser(Role.CLIENT);
  const data = await callsApi.mine();
  return (
    <>
      <PageHeader title="Calls" back={{ href: '/client/profile', label: 'Profile' }} meta={data.coachName ? `with ${data.coachName}` : undefined} />
      <div>
        {!data.coachName ? (
          <EmptyState title="No coach yet">Calls are booked with your coach once you are linked.</EmptyState>
        ) : !data.timezone && data.upcoming.length === 0 ? (
          <EmptyState title="No call times yet">{data.coachName} has not opened any call times. Message them to set one up.</EmptyState>
        ) : (
          <ClientBooking data={{ ...data, timezone: data.timezone ?? 'UTC' }} />
        )}
      </div>
    </>
  );
}
