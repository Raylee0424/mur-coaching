import Link from 'next/link';
import { PlanId, PLANS } from '@coaching/shared';
import { PlanCards } from '@/components/billing/PlanCards';
import { buttonClass } from '@/components/ui/Button';
import { Section } from './Section';

/** Public pricing snapshot matching Stitch `web_pricing_snapshot_billing`. */
export function Pricing() {
  return (
    <Section
      id="pricing"
      eyebrow="TRANSPARENT PRICING"
      title="Plans for Athletes & Coaches"
      intro="Zero ads, full data portability, and deterministic progression rules included on every tier."
    >
      <PlanCards
        plans={PLANS}
        action={(plan) => (
          <Link
            href="/signup"
            className={buttonClass(
              plan.id === PlanId.ATHLETE_PRO ? 'primary' : 'secondary',
              'w-full justify-center',
              'lg',
            )}
          >
            {plan.id === PlanId.COACH ? 'Start 14-Day Free Trial' : plan.priceCents === 0 ? 'Start Free' : 'Get Athletes Pro'}
          </Link>
        )}
      />
    </Section>
  );
}
