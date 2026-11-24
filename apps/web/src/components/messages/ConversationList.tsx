'use client';

import type { ConversationSummaryDto } from '@coaching/shared';
import clsx from 'clsx';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { formatMessageTime } from './messages-model';

function initials(name: string): string {
  const parts = name.replace(' (Demo)', '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase() || '?';
}

/** Stitch searchable client inbox rail (`coach_web_real_time_coach_client_messaging`). */
export function ConversationList({ conversations, selected }: { conversations: ConversationSummaryDto[]; selected: string | null }) {
  const [query, setQuery] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);

  const unreadTotal = useMemo(() => conversations.reduce((n, c) => n + (c.unread > 0 ? 1 : 0), 0), [conversations]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter((c) => {
      if (onlyUnread && c.unread === 0) return false;
      if (!q) return true;
      return c.clientName.toLowerCase().includes(q) || (c.lastMessage?.toLowerCase().includes(q) ?? false);
    });
  }, [conversations, query, onlyUnread]);

  if (conversations.length === 0) {
    return <p className="px-4 py-6 text-ui text-muted">No active clients yet. Invite one from the roster.</p>;
  }

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line p-4">
        <label className="relative block">
          <span className="sr-only">Search athletes or messages</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <Icon icon={Search} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search athletes or messages..."
            className="block h-10 w-full rounded-sm border border-line bg-canvas-low pl-9 pr-3 font-sans text-label-lg font-normal text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={!onlyUnread}
            onClick={() => setOnlyUnread(false)}
            className={clsx(
              'rounded-full px-3 py-1 font-sans text-label-sm transition-colors',
              !onlyUnread ? 'bg-primary text-primary-ink' : 'border border-line bg-canvas-low text-muted hover:text-ink',
            )}
          >
            All ({conversations.length})
          </button>
          <button
            type="button"
            aria-pressed={onlyUnread}
            onClick={() => setOnlyUnread(true)}
            className={clsx(
              'rounded-full px-3 py-1 font-sans text-label-sm transition-colors',
              onlyUnread ? 'bg-primary text-primary-ink' : 'border border-line bg-canvas-low text-muted hover:text-ink',
            )}
          >
            Unread ({unreadTotal})
          </button>
        </div>
      </div>

      <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
        {shown.length === 0 ? (
          <li className="px-4 py-6 text-center text-meta text-muted">No matching threads.</li>
        ) : (
          shown.map((c) => {
            const active = c.clientId === selected;
            return (
              <li key={c.clientId}>
                <Link
                  href={`/coach/messages?client=${encodeURIComponent(c.clientId)}`}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'flex items-start gap-3 p-4 transition-colors',
                    active ? 'bg-raised' : 'hover:bg-raised/70',
                  )}
                >
                  <span
                    className={clsx(
                      'relative inline-flex size-10 shrink-0 items-center justify-center rounded-full border font-sans text-label-md',
                      active ? 'border-primary bg-canvas-low text-primary' : 'border-line bg-canvas-low text-muted',
                    )}
                  >
                    {initials(c.clientName)}
                    <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card bg-emerald" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center justify-between gap-2">
                      <span className={clsx('truncate font-sans text-label-md', active ? 'text-primary' : 'text-ink')}>
                        {c.clientName}
                      </span>
                      {c.lastMessageAt ? (
                        <span className={clsx('shrink-0 font-mono text-label-sm', c.unread > 0 ? 'text-primary' : 'text-muted')}>
                          {formatMessageTime(c.lastMessageAt)}
                        </span>
                      ) : null}
                    </p>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className={clsx('truncate font-sans text-label-md font-normal', active ? 'text-ink' : 'text-muted')}>
                        {c.lastMessage ?? 'No messages yet'}
                      </p>
                      {c.unread > 0 ? (
                        <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 font-mono text-label-sm text-primary-ink tabular-nums">
                          {c.unread}
                          <span className="sr-only"> unread</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </>
  );
}
