import Link from 'next/link';
import { RecommendationStatus } from '@coaching/shared';
import type { NextTarget, WeightUnit } from '@coaching/shared';
import { ActionBadge } from '@/components/progression/ActionBadge';
import { buttonClass } from '@/components/ui/Button';
import { toNumber } from '@/lib/format';
import { formatTargetLine } from './logger-model';

/** SESSION COMPLETE: the engine's next call per exercise you trained. */
export function SessionComplete({ targets, unit, setsLogged }: { targets: NextTarget[]; unit: WeightUnit; setsLogged: number }) {
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Session complete</p>
        <h1 className="font-display text-3xl font-extrabold">Next Session Targets</h1>
        <p className="text-sm text-muted">
          {setsLogged} {setsLogged === 1 ? 'set' : 'sets'} logged.
        </p>
      </div>

      {targets.length === 0 ? (
        <p className="rounded-lg border border-line bg-card p-4 text-sm text-muted">
          Session saved. Next targets will show on your Today screen once there is enough history.
        </p>
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
              <li key={t.exerciseId} className="space-y-2.5 rounded-lg border border-line bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-base font-bold">{t.exerciseName}</h2>
                  {t.action ? <ActionBadge action={t.action} /> : null}
                </div>
                {line ? <p className="font-semibold text-primary tabular">Next: {line}</p> : null}
                <p className="text-sm text-muted">{t.reason ?? 'Not enough sessions yet to set a new target. Keep logging.'}</p>
                {t.status === RecommendationStatus.PENDING ? (
                  <p className="text-xs font-semibold text-amber">Waiting for your coach to approve this change.</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col gap-3">
        <Link href="/client" className={buttonClass('primary', 'min-h-12 w-full')}>
          Back to Today
        </Link>
        <Link href="/client/history" className={buttonClass('secondary', 'min-h-12 w-full')}>
          View history
        </Link>
      </div>
    </div>
  );
}
