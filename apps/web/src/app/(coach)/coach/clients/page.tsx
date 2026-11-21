import { Role } from '@coaching/shared';
import { AddClientForm } from '@/components/clients/AddClientForm';
import { RosterTable } from '@/components/clients/RosterTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { clientsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

export default async function ClientsPage() {
  await requireUser(Role.COACH);
  const clients = await clientsApi.list();
  return (
    <>
      <PageHeader title="Clients" subtitle={`${clients.length} ${clients.length === 1 ? 'client' : 'clients'}`} />
      <div className="space-y-6">
        <RosterTable clients={clients} />
        <AddClientForm />
      </div>
    </>
  );
}
