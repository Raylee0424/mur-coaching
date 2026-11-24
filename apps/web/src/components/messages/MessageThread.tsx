'use client';

import { isReadByOther, MESSAGE_LIMITS } from '@coaching/shared';
import type { MessageDto, MessageThreadDto } from '@coaching/shared';
import clsx from 'clsx';
import { CheckCheck, Send } from 'lucide-react';
import { Fragment, useCallback, useEffect, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from 'react';
import { loadThread, markThreadRead, sendMessage } from '@/actions/messages';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { dayKey, formatMessageTime, lastMineIndex, mergeMessages, POLL_MS } from './messages-model';

/**
 * One coach–client thread. New messages arrive by polling a server action every few seconds while the tab is
 * visible; there is no socket because the browser never holds the session token.
 * `clientId` names the client for a coach; null for the client's own thread.
 */
export function MessageThread({ clientId, initial }: { clientId: string | null; initial: MessageThreadDto }) {
  const [messages, setMessages] = useState<MessageDto[]>(initial.messages);
  const [olderCursor, setOlderCursor] = useState(initial.olderCursor);
  const [otherReadAt, setOtherReadAt] = useState(initial.otherReadAt);
  const [draft, setDraft] = useState('');
  const [announce, setAnnounce] = useState('');
  const [error, setError] = useState<string>();
  const [sending, startSend] = useTransition();
  const [loadingOlder, startOlder] = useTransition();
  const scroller = useRef<HTMLOListElement>(null);
  const latestId = useRef<string | null>(initial.messages.at(-1)?.id ?? null);
  const stickToBottom = useRef(true);

  const append = useCallback((incoming: MessageDto[]) => {
    if (incoming.length === 0) return;
    setMessages((cur) => {
      const next = mergeMessages(cur, incoming);
      latestId.current = next.at(-1)?.id ?? null;
      return next;
    });
  }, []);

  // Mark read on open, then poll.
  useEffect(() => {
    void markThreadRead(clientId);
    let stopped = false;
    const tick = async (): Promise<void> => {
      if (document.visibilityState !== 'visible') return;
      const res = await loadThread(clientId, latestId.current ? { after: latestId.current } : {});
      if (stopped || !res.ok) return;
      setOtherReadAt(res.data.otherReadAt);
      append(res.data.messages);
      const received = res.data.messages.filter((m) => !m.mine);
      if (received.length > 0) {
        setAnnounce(`New message from ${initial.otherName}: ${received.at(-1)?.body ?? ''}`);
        void markThreadRead(clientId);
      }
    };
    const timer = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [clientId, append, initial.otherName]);

  // Follow new messages only when the reader is already at the bottom.
  useEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function loadOlder(): void {
    if (!olderCursor) return;
    startOlder(async () => {
      const el = scroller.current;
      const fromBottom = el ? el.scrollHeight - el.scrollTop : 0;
      const res = await loadThread(clientId, { before: olderCursor });
      if (!res.ok) return setError(res.error);
      stickToBottom.current = false;
      setMessages((cur) => mergeMessages(cur, res.data.messages));
      setOlderCursor(res.data.olderCursor);
      // Keep the reader's place after older messages are added above.
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - fromBottom;
      });
    });
  }

  function submit(e?: FormEvent): void {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setError(undefined);
    startSend(async () => {
      const res = await sendMessage(clientId, body);
      if (!res.ok) return setError(res.error);
      stickToBottom.current = true;
      setDraft('');
      append([res.data]);
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
  }

  const receiptAt = lastMineIndex(messages);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p role="status" className="sr-only">
        {announce}
      </p>
      <ol
        ref={scroller}
        aria-label={`Messages with ${initial.otherName}`}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {olderCursor ? (
          <li className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={loadOlder} disabled={loadingOlder} aria-busy={loadingOlder}>
              {loadingOlder ? 'Loading…' : 'Load earlier messages'}
            </Button>
          </li>
        ) : null}
        {messages.length === 0 ? (
          <li className="py-10 text-center text-ui text-muted">No messages yet. Say hello to {initial.otherName}.</li>
        ) : null}
        {messages.map((m, i) => {
          const newDay = i === 0 || dayKey(m.createdAt) !== dayKey(messages[i - 1]?.createdAt ?? '');
          return (
            <Fragment key={m.id}>
              {newDay ? (
                <li aria-hidden="true" className="pt-2 text-center font-mono text-micro uppercase text-faint">
                  {new Date(m.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </li>
              ) : null}
              <li className={clsx('flex flex-col', m.mine ? 'items-end' : 'items-start')}>
                <span className="sr-only">{m.mine ? 'You' : initial.otherName}:</span>
                <p
                  className={clsx(
                    'max-w-[80%] whitespace-pre-wrap break-words rounded-md px-4 py-2.5 font-sans text-body-md',
                    m.mine ? 'border border-primary/40 bg-primary-container text-ink' : 'border border-line bg-canvas-low text-ink',
                  )}
                >
                  {m.body}
                </p>
                <span className="mt-1 flex items-center gap-1 font-mono text-micro text-muted">
                  {formatMessageTime(m.createdAt)}
                  {i === receiptAt ? (
                    isReadByOther(m, otherReadAt) ? (
                      <>
                        <Icon icon={CheckCheck} size={14} className="text-emerald" /> Read
                      </>
                    ) : (
                      <> · Sent</>
                    )
                  ) : null}
                </span>
              </li>
            </Fragment>
          );
        })}
      </ol>
      <form onSubmit={submit} className="border-t border-line bg-canvas-low/50 p-4">
        <FormError>{error}</FormError>
        <div className="flex items-end gap-2.5">
          <label htmlFor="message-draft" className="sr-only">
            Message {initial.otherName}
          </label>
          <textarea
            id="message-draft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={MESSAGE_LIMITS.maxBody}
            rows={2}
            placeholder={`Write a message to ${initial.otherName}...`}
            className="block min-h-11 w-full resize-y rounded-sm border border-line bg-canvas-low px-3.5 py-2.5 text-ui text-ink placeholder:text-muted transition-colors hover:border-line-strong focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button type="submit" size="lg" disabled={sending || !draft.trim()} aria-busy={sending}>
            <Icon icon={Send} />
            Send
          </Button>
        </div>
        <p className="mt-1.5 text-meta text-muted">Enter sends. Shift+Enter adds a line.</p>
      </form>
    </div>
  );
}
