import { Role } from '@coaching/shared';
import { MessageThread } from '@/components/messages/MessageThread';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { ApiError } from '@/lib/api/client';
import { messagingApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

export default async function ClientMessagesPage() {
  await requireUser(Role.CLIENT);
  // 404 means no active coach link: show the empty state instead of an error page.
  const thread = await messagingApi.myThread().catch((err: unknown) => {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  });

  return (
    <>
      <PageHeader title={thread ? thread.otherName : 'Messages'} meta={thread ? 'Your coach' : undefined} back={{ href: '/client/profile', label: 'Profile' }} />
      {thread ? (
        <div className="flex h-[calc(100dvh-13rem)] min-h-[24rem] max-w-3xl flex-col overflow-hidden rounded-md border border-line bg-card md:h-[calc(100dvh-9rem)]">
          <MessageThread clientId={null} initial={thread} />
        </div>
      ) : (
        <EmptyState title="No coach to message">Messages open once you are linked to an active coach.</EmptyState>
      )}
    </>
  );
}
