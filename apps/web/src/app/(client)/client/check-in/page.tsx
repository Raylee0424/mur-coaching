import clsx from 'clsx';
import { Camera } from 'lucide-react';
import Link from 'next/link';
import { Role } from '@coaching/shared';
import { answerText } from '@/components/check-ins/check-ins-model';
import { CheckInForm } from '@/components/check-ins/CheckInForm';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { checkInsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { firstParam } from '@/lib/form';
import { formatDate } from '@/lib/format';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const day = (iso: string): string => formatDate(`${iso}T00:00:00Z`);

export default async function ClientCheckInPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser(Role.CLIENT);
  const [{ due, recent }, params] = await Promise.all([checkInsApi.mine(), searchParams]);
  const tab = firstParam(params.tab) === 'steps' ? 'steps' : 'checkin';
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title="Step Tracking, Health Sync & Check-in"
        back={{ href: '/client/profile', label: 'Settings' }}
        meta={due.length ? <Badge tone="amber">{due.length} due</Badge> : <Badge tone="emerald">Caught up</Badge>}
        actions={
          <nav aria-label="Check-in sections" className="inline-flex gap-1 rounded-sm border border-line bg-canvas-low p-1">
            <Link
              href="/client/check-in"
              aria-current={tab === 'checkin' ? 'page' : undefined}
              className={clsx(
                'rounded-sm px-3.5 py-1.5 font-sans text-label-sm font-semibold transition-colors',
                tab === 'checkin' ? 'bg-primary text-primary-ink' : 'text-muted hover:text-ink',
              )}
            >
              Weekly Check-in &amp; Photos
            </Link>
            <Link
              href="/client/check-in?tab=steps"
              aria-current={tab === 'steps' ? 'page' : undefined}
              className={clsx(
                'rounded-sm px-3.5 py-1.5 font-sans text-label-sm font-semibold transition-colors',
                tab === 'steps' ? 'bg-primary text-primary-ink' : 'text-muted hover:text-ink',
              )}
            >
              Steps &amp; Health Sync
            </Link>
          </nav>
        }
      />

      {tab === 'steps' ? (
        <section className="space-y-6">
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
            <div className="flex flex-col justify-between gap-4 rounded-md border border-line bg-card p-6 lg:col-span-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-label-sm uppercase text-primary">DAILY STEP GOAL</span>
                  <h2 className="mt-0.5 font-display text-headline-md text-ink">10,000 / day</h2>
                </div>
                <Badge tone="slate">PWA Bridge</Badge>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full border border-line bg-canvas-low">
                <div className="h-full w-0 rounded-full bg-primary" />
              </div>
              <p className="font-mono text-label-sm text-muted">
                Log daily step averages inside your weekly coach check-in or sync via native health bridge when mobile apps ship.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
              <article className="flex flex-col justify-between gap-4 rounded-md border border-line bg-card p-5">
                <div className="flex items-center justify-between">
                  <span className="font-display text-title-md text-ink">Apple Health</span>
                  <Badge tone="slate">iOS App Bridge</Badge>
                </div>
                <p className="text-label-md text-muted">
                  Automatic step, sleep duration, and resting HR sync requires the native iOS wrapper. Use Weekly Check-in on web.
                </p>
                <Link
                  href="/client/check-in"
                  className="w-full rounded-full border border-line bg-canvas-low py-1.5 text-center font-sans text-label-sm font-semibold text-primary hover:border-primary"
                >
                  Log in Weekly Check-in
                </Link>
              </article>

              <article className="flex flex-col justify-between gap-4 rounded-md border border-line bg-card p-5">
                <div className="flex items-center justify-between">
                  <span className="font-display text-title-md text-ink">Health Connect</span>
                  <Badge tone="slate">Standby</Badge>
                </div>
                <p className="text-label-md text-muted">
                  Android &amp; WearOS bridge for daily step counts, sleep stages, and readiness telemetry.
                </p>
                <Link
                  href="/client/body"
                  className="w-full rounded-full border border-line bg-canvas-low py-1.5 text-center font-sans text-label-sm font-semibold text-ink hover:border-primary"
                >
                  Open Body &amp; Readiness
                </Link>
              </article>
            </div>
          </div>
        </section>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-7">
              {due.length === 0 ? (
                <EmptyState title="You’re all caught up">
                  Your next check-in opens here 3 days before its scheduled due date.
                </EmptyState>
              ) : (
                due.map((c) => (
                  <CheckInForm
                    key={`${c.scheduleId}:${c.periodDate}`}
                    checkIn={c}
                    dueLabel={c.periodDate < todayIso ? `Was due ${day(c.periodDate)}` : c.periodDate === todayIso ? 'Due today' : `Due ${day(c.periodDate)}`}
                  />
                ))
              )}
            </div>

            <aside className="flex flex-col gap-4 rounded-md border border-line bg-card p-6 lg:col-span-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-title-md text-ink">Progress Photos (EXIF Stripped)</h2>
                <Badge tone="signal">Private</Badge>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(['Front', 'Side', 'Back'] as const).map((pose) => (
                  <Link
                    key={pose}
                    href="/client/body#photos-heading"
                    className="flex h-32 flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-line-strong bg-canvas-low text-muted transition-colors hover:border-primary hover:text-primary"
                  >
                    <Icon icon={Camera} size={20} className="text-primary" />
                    <span className="font-sans text-label-sm font-semibold">{pose}</span>
                  </Link>
                ))}
              </div>
              <p className="text-label-sm text-muted">
                Photos live on your{' '}
                <Link href="/client/body" className="text-primary hover:underline">
                  Bodyweight &amp; Readiness
                </Link>{' '}
                page and remain private until you toggle coach sharing.
              </p>
            </aside>
          </div>

          {recent.length > 0 ? (
            <section aria-labelledby="recent-heading" className="space-y-3">
              <h2 id="recent-heading" className="font-display text-title-lg text-ink">
                Recent Check-ins &amp; Coach Replies
              </h2>
              <ul className="space-y-3">
                {recent.map((r) => (
                  <li key={r.id} className="rounded-md border border-line bg-card p-5">
                    <details>
                      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                        <span className="font-display text-title-md text-ink">
                          {r.templateTitle} · <span className="font-mono text-label-md text-muted">{day(r.periodDate)}</span>
                        </span>
                        {r.coachReply ? <Badge tone="emerald">Coach replied</Badge> : r.reviewedAt ? <Badge tone="sky">Reviewed</Badge> : <Badge>Sent</Badge>}
                      </summary>
                      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                        {r.answers.map((a) => (
                          <div key={a.questionId} className="rounded-sm border border-line bg-canvas-low p-3">
                            <dt className="font-mono text-label-sm uppercase text-muted">{a.prompt}</dt>
                            <dd className="mt-1 whitespace-pre-wrap text-ui text-ink">{answerText(a)}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                    {r.coachReply ? (
                      <blockquote className="mt-4 rounded-sm border-l-2 border-primary bg-primary-container/40 px-4 py-3 text-ui text-ink">
                        <p className="font-mono text-label-sm uppercase text-primary">Coach Reply</p>
                        <p className="mt-1 whitespace-pre-wrap">{r.coachReply}</p>
                      </blockquote>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
