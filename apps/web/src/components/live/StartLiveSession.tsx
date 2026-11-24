'use client';

import { LIVE_LIMITS, LIVE_MODE_LABELS, LiveMode } from '@coaching/shared';
import { useState, useTransition } from 'react';
import { startLiveSession } from '@/actions/live';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';

export function StartLiveSession({ clients }: { clients: { id: string; name: string }[] }) {
  const toast = useToast();
  const [mode, setMode] = useState<LiveMode>(LiveMode.REMOTE);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const toggle = (id: string) => setPicked((p) => (mode === LiveMode.REMOTE ? [id] : p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(0, LIVE_LIMITS.maxParticipants)));

  function submit(form: FormData): void {
    setError(undefined);
    const title = String(form.get('title') ?? '').trim();
    if (!title) return setError('Name the session.');
    if (picked.length === 0) return setError('Pick at least one athlete.');
    start(async () => {
      const res = await startLiveSession({ title, mode, clientIds: picked });
      if (!res.ok) return setError(res.error);
      toast.show({ message: 'Session started', tone: 'ok' });
    });
  }

  return (
    <form action={submit} className="space-y-4 p-4">
      <div>
        <Label htmlFor="ls-title">Session</Label>
        <Input id="ls-title" name="title" required maxLength={LIVE_LIMITS.maxTitle} placeholder="Lower Strength A" />
      </div>
      <fieldset>
        <legend className="mb-2 font-mono text-micro uppercase text-muted">Mode</legend>
        <div className="flex flex-wrap gap-4">
          {Object.values(LiveMode).map((m) => (
            <label key={m} className="flex min-h-9 items-center gap-2 text-ui">
              <input
                type="radio"
                name="mode"
                checked={mode === m}
                onChange={() => {
                  setMode(m);
                  if (m === LiveMode.REMOTE) setPicked((p) => p.slice(0, 1));
                }}
                className="size-4"
              />
              {LIVE_MODE_LABELS[m]}
            </label>
          ))}
        </div>
        <p className="mt-1 text-meta text-muted">{mode === LiveMode.REMOTE ? 'One athlete, on a video call.' : `Up to ${LIVE_LIMITS.maxParticipants} athletes on the gym floor. Works offline.`}</p>
      </fieldset>
      <fieldset>
        <legend className="mb-2 font-mono text-micro uppercase text-muted">{mode === LiveMode.REMOTE ? 'Athlete' : 'Athletes'}</legend>
        {clients.length === 0 ? (
          <p className="text-ui text-muted">No active clients.</p>
        ) : (
          <div className="grid gap-1 sm:grid-cols-2">
            {clients.map((c) => (
              <label key={c.id} className="flex min-h-9 items-center gap-2 text-ui">
                <input type={mode === LiveMode.REMOTE ? 'radio' : 'checkbox'} name="client" checked={picked.includes(c.id)} onChange={() => toggle(c.id)} className="size-4" />
                {c.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <FormError>{error}</FormError>
      <Button type="submit" disabled={pending || clients.length === 0} aria-busy={pending}>
        Start session
      </Button>
    </form>
  );
}
