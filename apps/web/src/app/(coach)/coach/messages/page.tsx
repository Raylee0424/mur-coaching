import clsx from 'clsx';
import Link from 'next/link';
import { Role } from '@coaching/shared';
import { ConversationList } from '@/components/messages/ConversationList';
import { MessageThread } from '@/components/messages/MessageThread';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { messagingApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { initials } from '@/lib/initials';
import { firstParam } from '@/lib/form';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CoachMessagesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser(Role.COACH);
  const [inbox, params] = await Promise.all([messagingApi.inbox(), searchParams]);
  const requested = firstParam(params.client) ?? null;
  const selected = inbox.conversations.find((c) => c.clientId === requested)?.clientId ?? inbox.conversations[0]?.clientId ?? null;
  const mobileThreadOpen = requested !== null && inbox.conversations.some((c) => c.clientId === requested);
  const thread = selected ? await messagingApi.thread(selected) : null;

  return (
    <>
      <PageHeader
        title="Real-Time Messaging"
        meta={
          <Badge tone="emerald">
            {inbox.totalUnread > 0 ? `${inbox.totalUnread} unread` : 'Live Polling Active'}
          </Badge>
        }
      />

      <div className="grid h-[calc(100dvh-9.5rem)] min-h-[30rem] items-stretch gap-6 lg:grid-cols-12">
        {/* Left Pane: Searchable Client List */}
        <section
          aria-label="Conversations"
          className={clsx(
            'flex min-h-0 flex-col overflow-hidden rounded-md border border-line bg-card lg:col-span-4',
            mobileThreadOpen && 'max-lg:hidden',
          )}
        >
          <ConversationList conversations={inbox.conversations} selected={selected} />
        </section>

        {/* Right Pane: Active Thread */}
        <section
          aria-label="Thread"
          className={clsx(
            'flex min-h-0 flex-col justify-between overflow-hidden rounded-md border border-line bg-card lg:col-span-8',
            !mobileThreadOpen && 'max-lg:hidden',
          )}
        >
          {thread && selected ? (
            <>
              <header className="flex items-center justify-between gap-4 border-b border-line p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Link href="/coach/messages" className="font-sans text-label-md text-primary hover:underline lg:hidden">
                    ← All
                  </Link>
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-raised font-sans text-label-md text-primary">
                    {initials(thread.otherName)}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-title-md text-ink">{thread.otherName}</h2>
                    <p className="font-sans text-label-sm text-emerald">Active Roster Athlete</p>
                  </div>
                </div>
                <Link href={`/coach/clients/${encodeURIComponent(selected)}`} className={buttonClass('secondary', 'shrink-0', 'sm')}>
                  View Profile
                </Link>
              </header>
              <MessageThread key={selected} clientId={selected} initial={thread} />
            </>
          ) : (
            <div className="m-auto p-6">
              <EmptyState title="Pick a conversation">Choose an athlete on the left to read and reply.</EmptyState>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
