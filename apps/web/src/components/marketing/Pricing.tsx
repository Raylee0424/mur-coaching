import Link from 'next/link';
import { PLANS } from '@coaching/shared';
import { PlanCards } from '@/components/billing/PlanCards';
import { buttonClass } from '@/components/ui/Button';
import { Section } from './Section';

/** Public pricing. Billing detail (card, invoices, portal) stays behind sign-in. */
export function Pricing() {
  return (
    <Section
      id="pricing"
      title="Plans for athletes and coaches"
      intro="No ads on any plan. Your logged training is never deleted or hidden, whatever you pay. The deterministic engine is on every tier."
    >
      <PlanCards
        plans={PLANS}
        action={(plan) => (
          <Link href="/signup" className={buttonClass(plan.priceCents === 0 ? 'secondary' : 'primary', 'w-full justify-center')}>
            {plan.id === 'coach' ? 'Start free trial' : plan.priceCents === 0 ? 'Start free' : 'Get Pro'}
          </Link>
        )}
      />
    </Section>
  );
}
