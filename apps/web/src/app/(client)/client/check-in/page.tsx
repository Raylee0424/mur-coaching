import Link from 'next/link';
import { Role } from '@coaching/shared';
import { answerText } from '@/components/check-ins/check-ins-model';
import { CheckInForm } from '@/components/check-ins/CheckInForm';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { checkInsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';

const day = (iso: string): string => formatDate(`${iso}T00:00:00Z`);

export default async function ClientCheckInPage() {
  await requireUser(Role.CLIENT);
  const { due, recent } = await checkInsApi.mine();
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="Check-in" back={{ href: '/client/profile', label: 'Profile' }} meta={due.length ? `${due.length} due` : 'Nothing due'} />
      <div className="max-w-2xl space-y-8">
        {due.length === 0 ? (
          <EmptyState title="You’re all caught up">Your next check-in shows here when it opens, 3 days before it is due.</EmptyState>
        ) : (
          due.map((c) => (
            <CheckInForm
              key={`${c.scheduleId}:${c.periodDate}`}
              checkIn={c}
              dueLabel={c.periodDate < todayIso ? `Was due ${day(c.periodDate)}` : c.periodDate === todayIso ? 'Due today' : `Due ${day(c.periodDate)}`}
            />
          ))
        )}

        <p className="text-ui text-muted">
          Progress photos live on your{' '}
          <Link href="/client/body" className="text-primary hover:underline">
            Bodyweight page
          </Link>
          . They stay private until you share them with your coach.
        </p>

        {recent.length > 0 ? (
          <section aria-labelledby="recent-heading" className="space-y-3">
            <h2 id="recent-heading" className="font-display text-title font-semibold">
              Recent check-ins
            </h2>
            <ul className="space-y-3">
              {recent.map((r) => (
                <li key={r.id} className="rounded-md border border-line bg-card p-4">
                  <details>
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                      <span className="text-ui font-medium">
                        {r.templateTitle} · {day(r.periodDate)}
                      </span>
                      {r.coachReply ? <Badge tone="emerald">Coach replied</Badge> : r.reviewedAt ? <Badge tone="sky">Reviewed</Badge> : <Badge>Sent</Badge>}
                    </summary>
                    <dl className="mt-3 space-y-2">
                      {r.answers.map((a) => (
                        <div key={a.questionId}>
                          <dt className="font-mono text-micro uppercase text-muted">{a.prompt}</dt>
                          <dd className="whitespace-pre-wrap text-ui">{answerText(a)}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                  {r.coachReply ? (
                    <blockquote className="mt-3 border-l-2 border-signal pl-3 text-ui">
                      <p className="font-mono text-micro uppercase text-muted">Coach reply</p>
                      <p className="whitespace-pre-wrap">{r.coachReply}</p>
                    </blockquote>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
