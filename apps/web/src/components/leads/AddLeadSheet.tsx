'use client';

import { UserPlus } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { GOAL_OPTIONS } from '@coaching/shared';
import { addLead } from '@/actions/leads';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { useToast } from '@/components/ui/Toast';

/** Add a lead by hand (a DM, a referral, a call). Web-form leads arrive on their own. */
export function AddLeadSheet() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(addLead, null);

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      toast.show({ message: 'Lead added', tone: 'ok' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to a new result only
  }, [state]);

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Icon icon={UserPlus} />
        Add lead
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Add lead"
        description="Track someone who reached out outside the form."
        form={{ action }}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Adding…">Add lead</SubmitButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="lead-name">Full name</Label>
            <Input id="lead-name" name="name" required maxLength={100} autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="lead-email">Email address</Label>
            <Input id="lead-email" name="email" type="email" required autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="lead-phone">Phone (optional)</Label>
            <Input id="lead-phone" name="phone" type="tel" maxLength={40} autoComplete="off" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="lead-goal">Goal</Label>
              <Select id="lead-goal" name="goal" defaultValue="">
                <option value="">Not sure yet</option>
                {GOAL_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="lead-value">Monthly value (USD)</Label>
              <Input id="lead-value" name="value" inputMode="decimal" placeholder="320" />
            </div>
          </div>
          <FormError>{state && !state.ok ? state.error : undefined}</FormError>
        </div>
      </Sheet>
    </>
  );
}
