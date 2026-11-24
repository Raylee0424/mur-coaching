import clsx from 'clsx';
import Link from 'next/link';
import { Role } from '@coaching/shared';
import { ConversationList } from '@/components/messages/ConversationList';
import { MessageThread } from '@/components/messages/MessageThread';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { messagingApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { firstParam } from '@/lib/form';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CoachMessagesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser(Role.COACH);
  const [inbox, params] = await Promise.all([messagingApi.inbox(), searchParams]);
  const requested = firstParam(params.client) ?? null;
  const selected = inbox.conversations.find((c) => c.clientId === requested)?.clientId ?? null;
  const thread = selected ? await messagingApi.thread(selected) : null;

  return (
    <>
      <PageHeader title="Messages" meta={inbox.totalUnread > 0 ? `${inbox.totalUnread} unread` : 'All caught up'} />
      <div className="grid h-[calc(100dvh-9rem)] min-h-[28rem] overflow-hidden rounded-md border border-line bg-card md:grid-cols-[18rem_1fr]">
        {/* Phones show the list or the open thread, not both. */}
        <section aria-label="Conversations" className={clsx('min-h-0 overflow-y-auto border-line md:border-r', selected && 'max-md:hidden')}>
          <ConversationList conversations={inbox.conversations} selected={selected} />
        </section>
        <section aria-label="Thread" className={clsx('flex min-h-0 flex-col', !selected && 'max-md:hidden')}>
          {thread && selected ? (
            <>
              <header className="flex h-12 items-center justify-between gap-3 border-b border-line px-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Link href="/coach/messages" className="text-ui text-primary hover:underline md:hidden">
                    All
                  </Link>
                  <h2 className="truncate text-ui font-semibold">{thread.otherName}</h2>
                </div>
                <Link href={`/coach/clients/${encodeURIComponent(selected)}`} className="shrink-0 text-ui text-primary hover:underline">
                  View profile
                </Link>
              </header>
              <MessageThread key={selected} clientId={selected} initial={thread} />
            </>
          ) : (
            <div className="m-auto p-6">
              <EmptyState title="Pick a conversation">Choose a client on the left to read and reply.</EmptyState>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
