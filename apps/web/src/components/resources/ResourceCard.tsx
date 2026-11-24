'use client';

import { Download, Trash2, Users } from 'lucide-react';
import { useState, useTransition } from 'react';
import { RESOURCE_KIND_LABELS } from '@coaching/shared';
import type { ResourceDto } from '@coaching/shared';
import { deleteResource, openResource, shareResource } from '@/actions/resources';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { FormError } from '@/components/ui/Field';
import { formatBytes, shareLabel } from './resources-model';

export function ResourceCard({ resource, clients }: { resource: ResourceDto; clients: { id: string; name: string }[] }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [sharing, setSharing] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(resource.sharedWith));
  const [error, setError] = useState<string>();

  const toggle = (id: string): void =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  function saveShares(): void {
    startTransition(async () => {
      const result = await shareResource(resource.id, [...picked]);
      if (!result.ok) return setError(result.error);
      setError(undefined);
      setSharing(false);
      toast.show({ message: 'Sharing updated', tone: 'ok' });
    });
  }

  function remove(): void {
    if (!window.confirm(`Delete "${resource.title}"? Clients lose access immediately.`)) return;
    startTransition(async () => {
      const result = await deleteResource(resource.id);
      if (!result.ok) toast.show({ message: result.error, tone: 'error' });
    });
  }

  function open(): void {
    startTransition(async () => {
      const result = await openResource(resource.id);
      if (result && !result.ok) toast.show({ message: result.error, tone: 'error' });
    });
  }

  return (
    <li className="flex flex-col rounded-md border border-line bg-card">
      <div className="flex-1 space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <Badge>{RESOURCE_KIND_LABELS[resource.kind]}</Badge>
          <span className="font-mono text-micro text-faint">{formatBytes(resource.sizeBytes)}</span>
        </div>
        <h3 className="text-ui font-semibold">{resource.title}</h3>
        {resource.description ? <p className="text-meta text-muted">{resource.description}</p> : null}
        <p className="text-meta text-muted">{shareLabel(resource.sharedWith.length)}</p>
      </div>
      <div className="flex items-center gap-1 border-t border-line px-2 py-2">
        <Button variant="ghost" size="sm" onClick={open} disabled={pending}>
          <Icon icon={Download} />
          Open
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setSharing(true)} disabled={pending}>
          <Icon icon={Users} />
          Share
        </Button>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={remove} disabled={pending} aria-label={`Delete ${resource.title}`}>
          <Icon icon={Trash2} />
        </Button>
      </div>
      <Sheet
        open={sharing}
        onClose={() => setSharing(false)}
        title={`Share "${resource.title}"`}
        description="Checked clients see this file on their Resources page."
        footer={
          <>
            <Button variant="ghost" onClick={() => setSharing(false)}>
              Cancel
            </Button>
            <Button onClick={saveShares} disabled={pending}>
              Save sharing
            </Button>
          </>
        }
      >
        {clients.length === 0 ? (
          <p className="text-ui text-muted">You have no clients yet. Invite one first.</p>
        ) : (
          <fieldset className="space-y-2">
            <legend className="sr-only">Clients</legend>
            <div className="flex gap-2 pb-1">
              <Button variant="secondary" size="sm" onClick={() => setPicked(new Set(clients.map((c) => c.id)))}>
                Select all
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setPicked(new Set())}>
                Clear
              </Button>
            </div>
            {clients.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-ui">
                <input type="checkbox" checked={picked.has(c.id)} onChange={() => toggle(c.id)} />
                {c.name}
              </label>
            ))}
          </fieldset>
        )}
        <FormError>{error}</FormError>
      </Sheet>
    </li>
  );
}
