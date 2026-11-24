'use client';

import { Plus } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { OfferInterval } from '@coaching/shared';
import { createOffer } from '@/actions/billing';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { useToast } from '@/components/ui/Toast';

/** "New offer" button + sheet. Prices are set once; archive and recreate to change one. */
export function OfferForm({ disabledReason }: { disabledReason: string | null }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createOffer, null);

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      toast.show({ message: 'Offer created', tone: 'ok' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to a new result only
  }, [state]);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} disabled={disabledReason !== null} title={disabledReason ?? undefined}>
        <Icon icon={Plus} />
        New offer
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="New coaching offer"
        description="Clients pay through Stripe Checkout. Card details never touch MUR Coaching."
        form={{ action }}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Creating…">Create offer</SubmitButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="offer-name">Name</Label>
            <Input id="offer-name" name="name" required maxLength={80} placeholder="1:1 Strength & Nutrition" />
          </div>
          <div>
            <Label htmlFor="offer-description">Description (optional)</Label>
            <Input id="offer-description" name="description" maxLength={500} placeholder="Weekly check-ins, custom programming" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="offer-price">Price (USD)</Label>
              <Input id="offer-price" name="price" required inputMode="decimal" placeholder="320" className="font-mono" />
            </div>
            <div>
              <Label htmlFor="offer-interval">Billing</Label>
              <Select id="offer-interval" name="interval" defaultValue={OfferInterval.MONTH}>
                <option value={OfferInterval.MONTH}>Monthly</option>
                <option value={OfferInterval.ONE_TIME}>One-time</option>
              </Select>
            </div>
          </div>
          <FormError>{state && !state.ok ? state.error : undefined}</FormError>
        </div>
      </Sheet>
    </>
  );
}
