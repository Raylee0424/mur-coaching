'use client';

import { Archive, Copy } from 'lucide-react';
import { useTransition } from 'react';
import { archiveOffer } from '@/actions/billing';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

/** Copy the client-facing checkout link, or archive the offer. */
export function OfferActions({ offerId, checkoutUrl, name }: { offerId: string; checkoutUrl: string; name: string }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(checkoutUrl);
      toast.show({ message: 'Checkout link copied. Your client signs in, then pays on Stripe.', tone: 'ok' });
    } catch {
      toast.show({ message: `Copy failed. Link: ${checkoutUrl}`, tone: 'error' });
    }
  }

  function archive(): void {
    if (!window.confirm(`Archive "${name}"? Clients stop seeing it. Existing subscriptions keep billing until cancelled in Stripe.`)) return;
    startTransition(async () => {
      const result = await archiveOffer(offerId);
      toast.show(result.ok ? { message: 'Offer archived', tone: 'ok' } : { message: result.error, tone: 'error' });
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="secondary" size="sm" onClick={() => void copy()}>
        <Icon icon={Copy} />
        Copy checkout
      </Button>
      <Button variant="ghost" size="sm" onClick={archive} disabled={pending} aria-label={`Archive ${name}`}>
        <Icon icon={Archive} />
      </Button>
    </div>
  );
}
