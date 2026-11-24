import { Role } from '@coaching/shared';
import { RoadmapView } from '@/components/roadmap/RoadmapView';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { roadmapApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

export default async function ClientRoadmapPage() {
  await requireUser(Role.CLIENT);
  const roadmap = await roadmapApi.mine();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageHeader title="Roadmap" back={{ href: '/client/profile', label: 'Profile' }} />
      {roadmap ? (
        <RoadmapView roadmap={roadmap} today={today} />
      ) : (
        <EmptyState title="No roadmap yet">Your coach has not laid out a roadmap for you. Phases, goals and your meet countdown show up here.</EmptyState>
      )}
    </>
  );
}
