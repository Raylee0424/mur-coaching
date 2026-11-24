import clsx from 'clsx';
import Link from 'next/link';
import { Role, VIDEO_SIDE_LABELS } from '@coaching/shared';
import type { FormCheckDto } from '@coaching/shared';
import { FormCheckReviewer } from '@/components/form-checks/FormCheckReviewer';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { formChecksApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { firstParam } from '@/lib/form';
import { formatDate, formatRpe, toNumber } from '@/lib/format';
import { formatWeight } from '@/lib/units';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function rpeTone(rpe: string | null): string {
  if (!rpe) return 'text-muted';
  const n = toNumber(rpe);
  if (n >= 9) return 'text-rose';
  if (n >= 8.5) return 'text-sky';
  return 'text-emerald';
}

export default async function FormChecksPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser(Role.COACH);
  const [queue, params] = await Promise.all([formChecksApi.queue(), searchParams]);
  const all = [...queue.pending, ...queue.reviewed];
  const selected = all.find((c) => c.reviewId === firstParam(params.id)) ?? queue.pending[0] ?? all[0] ?? null;
  const weight = (kg: string) => formatWeight(kg, user.weightUnit);
  const line = (c: FormCheckDto) => `${c.video.exerciseName} · ${weight(c.video.weightKg)} × ${c.video.reps}`;

  const item = (c: FormCheckDto) => {
    const active = selected?.reviewId === c.reviewId;
    return (
      <li key={c.reviewId}>
        <Link
          href={`/coach/form-checks?id=${c.reviewId}`}
          aria-current={active ? 'true' : undefined}
          className={clsx(
            'flex flex-col gap-1 rounded-sm border p-3.5 text-left transition-colors',
            active ? 'border-primary bg-raised' : 'border-line bg-canvas-low hover:border-line-strong',
          )}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="truncate font-sans text-label-md text-ink">{c.clientName}</span>
            <span className={clsx('shrink-0 font-mono text-label-sm', active ? 'text-primary' : 'text-muted')}>
              {formatDate(c.review.requestedAt)}
            </span>
          </span>
          <span className="block truncate font-sans text-label-sm font-normal text-muted">{line(c)}</span>
          <span className={clsx('block font-mono text-label-sm', rpeTone(c.video.rpe))}>
            Set {c.video.setNumber}
            {c.video.rpe ? ` @ ${formatRpe(c.video.rpe)}` : ''} · {VIDEO_SIDE_LABELS[c.video.side]}
          </span>
        </Link>
      </li>
    );
  };

  return (
    <>
      <PageHeader
        title="Form Check Review Queue"
        meta={`${queue.pending.length} PENDING CLIPS${queue.avgTurnaroundHours !== null ? ` · AVG TURNAROUND ${queue.avgTurnaroundHours}H` : ''}`}
      />
      {!queue.storageConfigured ? (
        <p role="status" className="rounded-md border border-amber/40 bg-amber-bg p-4 font-sans text-label-md text-amber">
          Video storage is not configured on this server, so form checks are off.
        </p>
      ) : all.length === 0 ? (
        <EmptyState title="No form checks yet">Clients send clips from their Set Videos page. They land here for review.</EmptyState>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-12">
          {/* Left (3 cols): Client Clip Queue */}
          <aside className="flex flex-col gap-4 rounded-md border border-line bg-card p-4 lg:col-span-3">
            <div>
              <span className="px-1 font-sans text-label-sm uppercase tracking-wider text-muted">
                PENDING CLIPS ({queue.pending.length})
              </span>
              {queue.pending.length ? (
                <ul className="mt-2.5 space-y-2.5">{queue.pending.map(item)}</ul>
              ) : (
                <p className="mt-2 px-1 font-sans text-label-md font-normal text-muted">All caught up.</p>
              )}
            </div>

            {queue.reviewed.length ? (
              <div className="border-t border-line pt-4">
                <span className="px-1 font-sans text-label-sm uppercase tracking-wider text-muted">
                  RECENTLY REVIEWED ({queue.reviewed.length})
                </span>
                <ul className="mt-2.5 space-y-2.5">{queue.reviewed.map(item)}</ul>
              </div>
            ) : null}
          </aside>

          {/* Center + Right (9 cols): Telestrator Player + Narrated Review */}
          <div className="lg:col-span-9">
            {selected ? (
              <FormCheckReviewer key={selected.reviewId} check={selected} subtitle={line(selected)} />
            ) : (
              <EmptyState title="Pick a clip">Choose a clip from the list to review it.</EmptyState>
            )}
          </div>
        </div>
      )}
    </>
  );
}
