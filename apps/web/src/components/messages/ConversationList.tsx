import type { ConversationSummaryDto } from '@coaching/shared';
import clsx from 'clsx';
import Link from 'next/link';
import { formatMessageTime } from './messages-model';

/** Coach inbox rail. Each row links to `?client=<id>`. */
export function ConversationList({ conversations, selected }: { conversations: ConversationSummaryDto[]; selected: string | null }) {
  if (conversations.length === 0) return <p className="px-4 py-6 text-ui text-muted">No active clients yet. Invite one from the roster.</p>;
  return (
    <ul className="divide-y divide-line">
      {conversations.map((c) => (
        <li key={c.clientId}>
          <Link
            href={`/coach/messages?client=${encodeURIComponent(c.clientId)}`}
            aria-current={c.clientId === selected ? 'page' : undefined}
            className={clsx('flex min-h-14 items-start gap-3 px-4 py-3 transition-colors', c.clientId === selected ? 'bg-raised' : 'hover:bg-canvas-low')}
          >
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline justify-between gap-2">
                <span className={clsx('truncate text-ui', c.unread > 0 ? 'font-semibold text-ink' : 'font-medium')}>{c.clientName}</span>
                {c.lastMessageAt ? <span className="shrink-0 font-mono text-micro text-faint">{formatMessageTime(c.lastMessageAt)}</span> : null}
              </p>
              <p className="truncate text-meta text-muted">{c.lastMessage ?? 'No messages yet'}</p>
            </div>
            {c.unread > 0 ? (
              <span className="mt-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-signal px-1.5 font-mono text-micro text-canvas">
                {c.unread}
                <span className="sr-only"> unread</span>
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
