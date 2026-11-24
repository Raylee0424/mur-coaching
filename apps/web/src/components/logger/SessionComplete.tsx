import Link from 'next/link';
import clsx from 'clsx';
import { CircleCheck } from 'lucide-react';
import { RecommendationStatus } from '@coaching/shared';
import type { NextTarget, VideoableSetDto, WeightUnit } from '@coaching/shared';
import { ACTION_META, ActionBadge } from '@/components/progression/ActionBadge';
import { VideoUpload } from '@/components/videos/VideoUpload';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { toNumber } from '@/lib/format';
import { formatWeight } from '@/lib/units';
import { formatTargetLine } from './logger-model';

/** Session logged: the engine's next call per exercise you trained. */
export function SessionComplete({ targets, unit, setsLogged, clipSets }: { targets: NextTarget[]; unit: WeightUnit; setsLogged: number; clipSets: VideoableSetDto[] }) {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3 rounded-md border border-emerald/40 bg-emerald-bg p-5">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-emerald/40 bg-card text-emerald">
          <Icon icon={CircleCheck} size={20} />
        </span>
        <div>
          <span className="font-mono text-label-sm uppercase text-emerald">WORKOUT COMPLETE</span>
          <h1 className="font-display text-headline-md text-ink">Session logged.</h1>
          <p className="font-mono text-label-sm text-muted">
            {setsLogged} working {setsLogged === 1 ? 'set' : 'sets'} saved · Deterministic engine targets updated
          </p>
        </div>
      </div>

      {targets.length === 0 ? (
        <EmptyState title="Session saved">Next targets will show on your Today screen once there is enough history.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {targets.map((t) => {
            const line = t.target
              ? formatTargetLine(
                  {
                    weightKg: t.target.weightKg === null ? null : toNumber(t.target.weightKg),
                    repsMin: t.target.repsMin,
                    repsMax: t.target.repsMax,
                    rpe: null,
                  },
                  unit,
                )
              : '';
            return (
              <li
                key={t.exerciseId}
                className={clsx(
                  'space-y-2 rounded-md border p-5',
                  t.action ? ACTION_META[t.action].box : 'border-line bg-card',
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-title-md text-ink">{t.exerciseName}</h2>
                  {t.action ? <ActionBadge action={t.action} /> : null}
                </div>
                {line ? (
                  <p className={clsx('font-mono text-title-lg tabular-nums', t.action ? ACTION_META[t.action].text : 'text-ink')}>
                    {line}
                  </p>
                ) : null}
                <p className="text-label-md text-muted">{t.reason ?? 'Not enough sessions yet to set a new target. Keep logging.'}</p>
                {t.status === RecommendationStatus.PENDING ? (
                  <p className="font-mono text-label-sm text-amber">Waiting for your coach to approve this change.</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

 
      {clipSets.length > 0 ? (
        <section aria-labelledby="clip-heading" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-card p-5">
          <div>
            <h2 id="clip-heading" className="font-display text-title-md text-ink">Film a set?</h2>
            <p className="text-label-md text-muted">Attach a clip to any set you just logged. Private until you send it for a form check.</p>
          </div>
          <VideoUpload sets={clipSets} disabledReason={null} weight={(kg) => formatWeight(kg, unit)} />
        </section>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/client" className={buttonClass('primary', 'w-full', 'lg')}>
          Back to Today
        </Link>
        <Link href="/client/history" className={buttonClass('secondary', 'w-full', 'lg')}>
          View History
        </Link>
      </div>
    </div>
  );
}
