'use client';

import { Copy, Link2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { createShareLink, revokeShareLink } from '@/actions/programs';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';

/**
 * Read-only preview link for prospects. Only the token's hash is stored, so the link can be shown just once:
 * making a new one replaces the old.
 */
export function ShareLinkButton({ programId, active, disabledReason }: { programId: string; active: boolean; disabledReason: string | null }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(active);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function make(): void {
    setError(undefined);
    startTransition(async () => {
      const r = await createShareLink(programId);
      if (!r.ok) return setError(r.error);
      setUrl(`${window.location.origin}/preview/${r.data.token}`);
      setLive(true);
    });
  }

  function turnOff(): void {
    setError(undefined);
    startTransition(async () => {
      const r = await revokeShareLink(programId);
      if (!r.ok) return setError(r.error);
      setUrl(null);
      setLive(false);
      toast.show({ message: 'Preview link turned off', tone: 'ok' });
    });
  }

  async function copy(): Promise<void> {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.show({ message: 'Link copied', tone: 'ok' });
    } catch {
      toast.show({ message: 'Copy failed. Select the link and copy it by hand.', tone: 'error' });
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} disabled={disabledReason !== null} title={disabledReason ?? undefined}>
        <Icon icon={Link2} />
        Share preview
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Share a read-only preview"
        description="Anyone with the link can see the plan: weeks, blocks and prescriptions. No client data, no editing."
        footer={
          <>
            {live ? (
              <Button variant="ghost" onClick={turnOff} disabled={pending}>
                Turn off link
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={make} disabled={pending}>
              {pending ? 'Working…' : live ? 'Make a new link' : 'Create link'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {url ? (
            <div>
              <Label htmlFor="share-url">Preview link</Label>
              <div className="flex gap-2">
                <Input id="share-url" readOnly value={url} className="font-mono" onFocus={(e) => e.currentTarget.select()} />
                <Button variant="secondary" onClick={() => void copy()}>
                  <Icon icon={Copy} />
                  Copy
                </Button>
              </div>
              <p className="mt-2 text-meta text-muted">Copy it now: it is shown only once. Making a new link turns this one off.</p>
            </div>
          ) : (
            <p className="text-ui text-muted">
              {live ? 'A link is active. For safety it cannot be shown again; make a new one to get a link you can copy (the old one stops working).' : 'No link yet.'}
            </p>
          )}
          <FormError>{error}</FormError>
        </div>
      </Sheet>
    </>
  );
}
