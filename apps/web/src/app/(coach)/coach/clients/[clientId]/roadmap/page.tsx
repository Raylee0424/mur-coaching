import { notFound } from 'next/navigation';
import { Role } from '@coaching/shared';
import { ClientTabs } from '@/components/clients/ClientTabs';
import { RoadmapEditor } from '@/components/roadmap/RoadmapEditor';
import { RoadmapView } from '@/components/roadmap/RoadmapView';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { ApiError } from '@/lib/api/client';
import { clientsApi, programsApi, roadmapApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

export default async function ClientRoadmapPage({ params }: { params: Promise<{ clientId: string }> }) {
  await requireUser(Role.COACH);
  const { clientId } = await params;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const [client, roadmap, programs] = await Promise.all([clientsApi.get(clientId), roadmapApi.forClient(clientId), programsApi.list()]);
    return (
      <>
        <PageHeader
          title={`${client.name}: roadmap`}
          back={{ href: `/coach/clients/${clientId}`, label: 'Back to client' }}
          actions={<RoadmapEditor clientId={clientId} roadmap={roadmap} today={today} programs={programs} />}
        />
        <ClientTabs clientId={clientId} active="roadmap" />
        {roadmap ? (
          <RoadmapView roadmap={roadmap} today={today} />
        ) : (
          <EmptyState title="No roadmap yet">Lay out the phases, goals and meet date. Your client sees the same timeline and a countdown.</EmptyState>
        )}
      </>
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
}
