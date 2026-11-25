import { ClipboardCheck, Phone } from 'lucide-react';
import Link from 'next/link';
import { CALL_KIND_LABELS, Role } from '@coaching/shared';
import type { ClientCallsDto, ClientCheckInsDto } from '@coaching/shared';
import { dayLabel, timeLabel, zoneLabel } from '@/components/calls/calls-model';
import { MessageThread } from '@/components/messages/MessageThread';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { ApiError } from '@/lib/api/client';
import { callsApi, checkInsApi, messagingApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { initials } from '@/lib/initials';

export default async function ClientMessagesPage() {
  await requireUser(Role.CLIENT);
  // 404 means no active coach link: show the empty state instead of an error page.
  const [thread, calls, checkIns] = await Promise.all([
    messagingApi.myThread().catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }),
    // The rail is context, not the page: it drops a card rather than fail the thread.
    callsApi.mine().catch(() => null),
    checkInsApi.mine().catch(() => null),
  ]);

  return (
    <>
      <PageHeader title={thread ? thread.otherName : 'Messages'} meta={thread ? 'Your coach' : undefined} back={{ href: '/client/profile', label: 'Profile' }} />
      {thread ? (
        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
          <div className="flex h-[calc(100dvh-13rem)] min-h-[24rem] flex-col overflow-hidden rounded-md border border-line bg-card md:h-[calc(100dvh-9rem)] lg:col-span-8">
            <MessageThread clientId={null} initial={thread} />
          </div>
          <CoachRail coachName={thread.otherName} calls={calls} checkIns={checkIns} />
        </div>
      ) : (
        <EmptyState title="No coach to message">Messages open once you are linked to an active coach.</EmptyState>
      )}
    </>
  );
}

function CoachRail({ coachName, calls, checkIns }: { coachName: string; calls: ClientCallsDto | null; checkIns: ClientCheckInsDto | null }) {
  const next = calls?.upcoming[0] ?? null;
  // Server-rendered, so the viewer's zone is unknown: show the coach's zone and name it. Calls shows both.
  const zone = calls?.timezone ?? 'UTC';
  const latest = checkIns?.recent[0] ?? null;
  const due = checkIns?.due.length ?? 0;
  return (
    <aside aria-label="Coach details" className="space-y-4 lg:col-span-4">
      <section className="flex items-center gap-3 rounded-md border border-line bg-card p-5">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-line bg-raised font-sans text-label-lg text-primary">
          {initials(coachName)}
        </span>
        <div className="min-w-0">
          <h2 className="truncate font-display text-title-md text-ink">{coachName}</h2>
          <p className="font-sans text-label-sm text-muted">Your coach</p>
        </div>
      </section>

      <section aria-labelledby="rail-call" className="rounded-md border border-line bg-card p-5">
        <h2 id="rail-call" className="font-mono text-label-sm uppercase tracking-wider text-muted">
          Next call
        </h2>
        {next ? (
          <>
            <p className="mt-2 font-display text-title-md text-ink">{dayLabel(next.startsAt, zone)}</p>
            <p className="font-mono text-label-md text-muted">
              {timeLabel(next.startsAt, zone)} {zoneLabel(zone)} · {CALL_KIND_LABELS[next.kind]}
            </p>
          </>
        ) : (
          <p className="mt-2 text-meta text-muted">No call booked.</p>
        )}
      </section>

      <section aria-labelledby="rail-checkin" className="rounded-md border border-line bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="rail-checkin" className="font-mono text-label-sm uppercase tracking-wider text-muted">
            Latest check-in
          </h2>
          {due > 0 ? <Badge tone="amber">{due} due</Badge> : null}
        </div>
        {latest ? (
          <>
            <p className="mt-2 font-display text-title-md text-ink">{latest.templateTitle}</p>
            <p className="font-mono text-label-md text-muted">Sent {formatDate(latest.submittedAt)}</p>
            {latest.coachReply ? (
              <p className="mt-2 line-clamp-3 text-ui text-ink">&ldquo;{latest.coachReply}&rdquo;</p>
            ) : (
              <p className="mt-2 text-meta text-muted">{latest.reviewedAt ? 'Reviewed, no reply.' : 'Waiting for review.'}</p>
            )}
          </>
        ) : (
          <p className="mt-2 text-meta text-muted">No check-ins sent yet.</p>
        )}
      </section>

      <nav aria-label="Coach links" className="flex flex-wrap gap-2">
        <Link href="/client/calls" className={buttonClass('secondary', undefined, 'md')}>
          <Icon icon={Phone} />
          Calls
        </Link>
        <Link href="/client/check-in" className={buttonClass('secondary', undefined, 'md')}>
          <Icon icon={ClipboardCheck} />
          Check-in
        </Link>
      </nav>
    </aside>
  );
}
