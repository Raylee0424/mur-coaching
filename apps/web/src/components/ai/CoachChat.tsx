'use client';

import clsx from 'clsx';
import { BrainCircuit, Cpu, Dumbbell, Send, Trash2, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { AI_LIMITS } from '@coaching/shared';
import type { AiCitation, AiConversationDto, AiMessageDto, CoachOverviewDto } from '@coaching/shared';
import { askCoach, deleteCoachConversation } from '@/actions/ai';
import { ACTION_META } from '@/components/progression/ActionBadge';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClass } from '@/components/ui/Button';
import { FormError, Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { ACTION_TEXT, citationHref, latestCitations } from './coach-model';

function CitationCard({ c }: { c: AiCitation }) {
  return (
    <article className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-canvas-low p-3.5">
      <div className="min-w-0">
        <span className="font-mono text-label-sm uppercase text-muted">
          {c.kind === 'ENGINE' ? 'ENGINE CALL' : c.kind === 'PR' ? 'CITED PR' : 'CITED SESSION'} · {c.date}
        </span>
        <p className="mt-0.5 font-sans text-label-md font-semibold text-ink">{c.label}</p>
        <p className="font-mono text-label-sm text-muted">{c.detail}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {c.kind === 'ENGINE' ? <Badge tone={ACTION_META[c.action].tone}>{ACTION_TEXT[c.action]}</Badge> : null}
        <Link href={citationHref(c)} className={buttonClass('ghost', undefined, 'sm')}>
          {c.kind === 'ENGINE' ? 'Open in logger' : 'View'}
          <span className="sr-only"> {c.label}</span>
        </Link>
      </div>
    </article>
  );
}

function Message({ m }: { m: AiMessageDto }) {
  if (m.role === 'USER') {
    return (
      <div className="ml-auto max-w-[85%] rounded-md border border-primary/30 bg-primary-container px-4 py-3">
        <p className="whitespace-pre-wrap text-body text-ink">{m.content}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-md border border-line bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-sans text-label-md font-semibold text-primary">
          <Icon icon={BrainCircuit} size={16} />
          MUR AI Training Coach
        </span>
        <span className="flex items-center gap-2">
          <Badge tone={m.source === 'MODEL' ? 'signal' : 'slate'} icon={m.source === 'MODEL' ? undefined : Cpu}>
            {m.source === 'MODEL' ? 'AI answer' : 'Rules answer'}
          </Badge>
          <span className="font-mono text-label-sm text-muted">
            {m.citations.length} {m.citations.length === 1 ? 'source' : 'sources'} cited
          </span>
        </span>
      </div>
      <p className="whitespace-pre-wrap text-body text-ink">{m.content}</p>
      {m.citations.length ? (
        <div className="flex flex-col gap-2">
          {m.citations.map((c) => (
            <CitationCard key={`${c.kind}-${c.id}`} c={c} />
          ))}
        </div>
      ) : null}
      <p className="font-mono text-label-sm text-muted">
        Engine calls come from the deterministic progression engine. AI text explains them and never changes your workout.
      </p>
    </div>
  );
}

/** Two-column chat + context inspector rail. Read-only: nothing here edits workouts, templates or logs. */
export function CoachChat({ overview, initial }: { overview: CoachOverviewDto; initial: AiConversationDto | null }) {
  const router = useRouter();
  const [conversation, setConversation] = useState<AiConversationDto | null>(initial);
  const [stats, setStats] = useState(overview.stats);
  const [question, setQuestion] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const messages = conversation?.messages ?? [];
  const cited = latestCitations(messages);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (q.length < 2) return;
    setError(undefined);
    startTransition(async () => {
      const res = await askCoach(q, conversation?.id);
      if (!res.ok) return setError(res.error);
      setConversation(res.data.conversation);
      setStats(res.data.stats);
      setRemaining(res.data.remainingToday);
      setQuestion('');
      if (!conversation) router.replace(`/client/coach-ai?c=${encodeURIComponent(res.data.conversation.id)}`, { scroll: false });
    });
  }

  function remove() {
    if (!conversation) return;
    startTransition(async () => {
      const res = await deleteCoachConversation(conversation.id);
      if (!res.ok) return setError(res.error);
      router.replace('/client/coach-ai');
    });
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <section aria-label="Conversation" className="flex flex-col gap-4 lg:col-span-8">
        <div className="flex flex-col gap-4" aria-live="polite">
          {messages.length === 0 ? (
            <div className="rounded-md border border-line bg-card p-5">
              <p className="font-display text-title-md text-ink">Ask about your lift trends, fatigue or next session.</p>
              <p className="mt-1 text-body text-muted">
                Answers draw on your recent sessions, PRs, open engine calls, limitations and readiness, and cite them. Cycle data is never read.
              </p>
            </div>
          ) : (
            messages.map((m) => <Message key={m.id} m={m} />)
          )}
          {pending ? <p className="font-mono text-label-sm text-muted">Reading your training data…</p> : null}
        </div>

        <form onSubmit={send} className="flex flex-col gap-2 rounded-md border border-line bg-card p-4">
          <Label htmlFor="coach-question" className="sr-only">
            Question for the MUR AI Training Coach
          </Label>
          <div className="flex gap-2">
            <Input
              id="coach-question"
              value={question}
              maxLength={AI_LIMITS.maxQuestion}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask the MUR AI Training Coach about your lift trends, fatigue, or next session..."
              disabled={pending}
            />
            <Button type="submit" disabled={pending || question.trim().length < 2} aria-busy={pending}>
              <Icon icon={Send} size={16} />
              Send
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-label-sm text-muted">
            <span>{overview.modelEnabled ? 'AI model on' : 'Rules mode: no model configured'} · training guidance, not medical advice</span>
            {remaining !== null ? <span>{remaining} questions left today</span> : null}
          </div>
          <FormError>{error}</FormError>
        </form>
      </section>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:col-span-4">
        <div className="rounded-md border border-line bg-card p-5">
          <span className="font-mono text-label-sm uppercase text-primary">CONTEXT INSPECTOR</span>
          <h2 className="mt-1 font-display text-title-md text-ink">Referenced Sessions &amp; Metrics</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-sm border border-line bg-canvas-low p-3">
              <span className="font-mono text-label-sm uppercase text-muted">7D AVG RPE</span>
              <p className="mt-0.5 font-mono text-title-md text-ink">{stats.avgRpe7d ?? '—'}</p>
            </div>
            <div className="rounded-sm border border-line bg-canvas-low p-3">
              <span className="font-mono text-label-sm uppercase text-muted">READINESS</span>
              <p className="mt-0.5 font-mono text-title-md text-ink">{stats.readinessScore ?? '—'}</p>
            </div>
          </div>
          <span className="mt-4 block font-mono text-label-sm uppercase text-muted">CITED LOGS</span>
          {cited.length ? (
            <ul className="mt-2 flex flex-col gap-2">
              {cited.map((c) => (
                <li key={`${c.kind}-${c.id}`}>
                  <Link href={citationHref(c)} className="block rounded-sm border border-line bg-canvas-low p-3 transition-colors hover:border-primary/40">
                    <p className="flex items-center gap-1.5 font-sans text-label-md text-ink">
                      <Icon icon={c.kind === 'PR' ? Trophy : Dumbbell} size={14} className="text-muted" />
                      {c.date} · {c.label}
                    </p>
                    <p className="font-mono text-label-sm text-muted">{c.detail}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-meta text-muted">Sources appear here once the coach answers.</p>
          )}
        </div>

        <nav aria-label="Past conversations" className="rounded-md border border-line bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-label-sm uppercase text-muted">CONVERSATIONS</span>
            <Link href="/client/coach-ai" className="font-sans text-label-sm font-semibold text-primary hover:underline">
              New chat
            </Link>
          </div>
          {overview.conversations.length ? (
            <ul className="mt-2 flex flex-col gap-1">
              {overview.conversations.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/client/coach-ai?c=${encodeURIComponent(c.id)}`}
                    aria-current={c.id === conversation?.id ? 'page' : undefined}
                    className={clsx(
                      'block truncate rounded-sm px-2.5 py-1.5 text-label-md',
                      c.id === conversation?.id ? 'bg-primary-container text-primary' : 'text-muted hover:text-ink',
                    )}
                  >
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-meta text-muted">No conversations yet.</p>
          )}
          {conversation ? (
            <Button variant="ghost" size="sm" className="mt-3" onClick={remove} disabled={pending}>
              <Icon icon={Trash2} size={14} />
              Delete this conversation
            </Button>
          ) : null}
        </nav>
      </aside>
    </div>
  );
}
