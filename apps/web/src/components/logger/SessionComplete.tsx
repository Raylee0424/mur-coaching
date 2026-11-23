import Link from 'next/link';
import clsx from 'clsx';
import { RecommendationStatus } from '@coaching/shared';
import type { NextTarget, WeightUnit } from '@coaching/shared';
import { ACTION_META, ActionBadge } from '@/components/progression/ActionBadge';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { toNumber } from '@/lib/format';
import { formatTargetLine } from './logger-model';

/** Session logged: the engine's next call per exercise you trained. */
export function SessionComplete({ targets, unit, setsLogged }: { targets: NextTarget[]; unit: WeightUnit; setsLogged: number }) {
  return (
    <div className="max-w-xl space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-h1 font-semibold">Session logged.</h1>
        <p className="font-mono text-meta text-muted">
          {setsLogged} {setsLogged === 1 ? 'set' : 'sets'}
        </p>
      </div>

      {targets.length === 0 ? (
        <EmptyState title="Session saved">Next targets will show on your Today screen once there is enough history.</EmptyState>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
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
              <li key={t.exerciseId} className="space-y-1.5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-sans text-ui font-medium" style={{ fontStretch: '100%', letterSpacing: 0 }}>
                    {t.exerciseName}
                  </h2>
                  {t.action ? <ActionBadge action={t.action} /> : null}
                </div>
                {line ? <p className={clsx('font-mono text-[20px] leading-6', t.action ? ACTION_META[t.action].text : 'text-ink')}>{line}</p> : null}
                <p className="text-meta text-muted">{t.reason ?? 'Not enough sessions yet to set a new target. Keep logging.'}</p>
                {t.status === RecommendationStatus.PENDING ? <p className="text-meta text-amber">Waiting for your coach to approve this change.</p> : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-2">
        <Link href="/client" className={buttonClass('primary', 'w-full', 'lg')}>
          Back to today
        </Link>
        <Link href="/client/history" className={buttonClass('secondary', 'w-full', 'lg')}>
          View history
        </Link>
      </div>
    </div>
  );
}
