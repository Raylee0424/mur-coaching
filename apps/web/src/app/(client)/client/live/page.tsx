import { Role } from '@coaching/shared';
import { ClientLiveFeed } from '@/components/live/ClientLiveFeed';
import { PageHeader } from '@/components/ui/PageHeader';
import { liveApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

export default async function ClientLivePage() {
  const user = await requireUser(Role.CLIENT);
  const { session } = await liveApi.mine();
  return (
    <>
      <PageHeader title="Live session" back={{ href: '/client', label: 'Today' }} />
      <div className="max-w-3xl space-y-3">
        <p className="text-meta text-muted">Sets your coach logs for you appear here as they happen and land in your history.</p>
        <ClientLiveFeed initial={session} unit={user.weightUnit} />
      </div>
    </>
  );
}
