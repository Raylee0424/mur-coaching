import clsx from 'clsx';
import { CircleCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatMoney, type PlanDefinition } from '@coaching/shared';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';

const TAG: Record<string, string> = { 'athlete-free': 'No ads', 'athlete-pro': 'Pro', coach: '14-day trial' };

function priceSuffix(plan: PlanDefinition): string {
  if (plan.priceCents === 0) return 'forever';
  return plan.clientLimit ? `/ mo · up to ${plan.clientLimit} clients` : '/ month';
}

/**
 * Pricing cards shared by the landing page and the in-app billing pages.
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
    <ul className={clsx('grid gap-4', plans.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
      {plans.map((plan) => {
        const current = plan.id === currentPlanId;
        return (
          <li
            key={plan.id}
            className={clsx('flex flex-col rounded-md border bg-card p-5', current ? 'border-primary' : 'border-line')}
            aria-current={current ? 'true' : undefined}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-ui font-semibold">{plan.name}</h3>
              {current ? <Badge tone="signal">Current plan</Badge> : <Badge>{TAG[plan.id] ?? plan.name}</Badge>}
            </div>
            <p className="mt-4 flex items-baseline gap-1.5">
              <span className="font-display text-h1 font-semibold tabular-nums">{formatMoney(plan.priceCents)}</span>
              <span className="text-meta text-muted">{priceSuffix(plan)}</span>
            </p>
            <p className="mt-2 text-ui text-muted">{plan.summary}</p>
            <ul className="mt-4 flex-1 space-y-2">
              {plan.highlights.map((h) => (
                <li key={h} className="flex gap-2 text-ui">
                  <Icon icon={CircleCheck} className="mt-0.5 shrink-0 text-emerald" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5">{action(plan)}</div>
          </li>
        );
      })}
    </ul>
  );
}
