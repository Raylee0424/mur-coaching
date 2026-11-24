import clsx from 'clsx';
import { CircleCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatMoney, PlanId, type PlanDefinition } from '@coaching/shared';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';

const TAG: Record<string, { label: string; tone: BadgeTone }> = {
  [PlanId.ATHLETE_FREE]: { label: 'No Ads', tone: 'emerald' },
  [PlanId.ATHLETE_PRO]: { label: 'Popular', tone: 'signal' },
  [PlanId.COACH]: { label: '14-Day Trial', tone: 'sky' },
};

const CHECK_CLS: Record<string, string> = {
  [PlanId.ATHLETE_FREE]: 'text-emerald',
  [PlanId.ATHLETE_PRO]: 'text-primary',
  [PlanId.COACH]: 'text-sky',
};

function priceSuffix(plan: PlanDefinition): string {
  if (plan.priceCents === 0) return 'forever';
  return plan.clientLimit ? `/ mo · up to ${plan.clientLimit} clients` : '/ month';
}

/**
 * Stitch 3-tier pricing cards shared by the landing page and the in-app billing pages.
 * `action` renders each card's call to action; `currentPlanId` marks the plan the viewer is on.
 */
export function PlanCards({
  plans,
  currentPlanId,
  action,
}: {
  plans: readonly PlanDefinition[];
  currentPlanId?: string | null;
  action: (plan: PlanDefinition) => ReactNode;
}) {
  return (
    <ul className={clsx('grid items-stretch gap-6', plans.length >= 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2')}>
      {plans.map((plan) => {
        const current = plan.id === currentPlanId;
        const featured = currentPlanId === undefined ? plan.id === PlanId.ATHLETE_PRO : current;
        const tag = TAG[plan.id] ?? { label: plan.name, tone: 'slate' as const };
        return (
          <li
            key={plan.id}
            className={clsx(
              'flex h-full flex-col justify-between gap-6 rounded-md border bg-card p-7',
              featured ? 'border-primary' : 'border-line',
            )}
            aria-current={current ? 'true' : undefined}
          >
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-title-lg text-ink">{plan.name}</h3>
                {current ? <Badge tone="signal">Current Plan</Badge> : <Badge tone={tag.tone}>{tag.label}</Badge>}
              </div>
              <p className="flex items-baseline gap-2">
                <span
                  className={clsx(
                    'font-mono text-headline-lg font-bold tabular-nums',
                    featured ? 'text-primary' : 'text-ink',
                  )}
                >
                  {formatMoney(plan.priceCents)}
                </span>
                <span className="font-sans text-label-md text-muted">{priceSuffix(plan)}</span>
              </p>
              <p className="font-sans text-label-md font-normal text-muted">{plan.summary}</p>
              <ul className="flex flex-col gap-2.5 border-t border-line pt-4">
                {plan.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2.5 font-sans text-label-md font-normal text-ink">
                    <Icon icon={CircleCheck} className={clsx('mt-0.5 shrink-0', CHECK_CLS[plan.id] ?? 'text-emerald')} />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>{action(plan)}</div>
          </li>
        );
      })}
    </ul>
  );
}
