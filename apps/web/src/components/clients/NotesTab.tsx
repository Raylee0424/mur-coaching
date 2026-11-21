'use client';

import { useState, useTransition } from 'react';
import { saveClientNotes } from '@/actions/clients';
import { Button } from '@/components/ui/Button';
import { FormError, Label } from '@/components/ui/Field';

const MAX = 2000;

/** Private coach notes. The client never sees them (the API returns null notes to clients). */
export function NotesTab({ clientId, initial }: { clientId: string; initial: string }) {
  const [saved, setSaved] = useState(initial);
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string>();
  const [justSaved, setJustSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const dirty = text !== saved;

  function save(): void {
    setError(undefined);
    setJustSaved(false);
    startTransition(async () => {
      const r = await saveClientNotes(clientId, text);
      if (r.ok) {
        setSaved(text);
        setJustSaved(true);
      } else setError(r.error);
    });
  }

  return (
    <section className="max-w-3xl space-y-3 rounded-lg border border-line bg-card p-5">
      <div>
        <h2 className="font-display text-lg font-bold">Private notes</h2>
        <p className="text-sm text-muted">Only you can see these. Use them for injuries, preferences and context behind your calls.</p>
      </div>
      <div>
        <Label htmlFor="coach-notes">Notes</Label>
        <textarea
          id="coach-notes"
          rows={10}
          maxLength={MAX}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setJustSaved(false);
          }}
          placeholder="e.g. Left shoulder tight on heavy pressing, keep an eye on it."
          className="block w-full rounded-md border border-line bg-canvas-low px-3 py-2 text-base text-ink placeholder:text-muted/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />
        <p className="mt-1 text-right text-xs tabular-nums text-muted">
          {text.length} / {MAX}
        </p>
      </div>
      <FormError>{error}</FormError>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={!dirty || pending}>
          {pending ? 'Saving…' : 'Save notes'}
        </Button>
        <span role="status" className="text-sm text-muted">
          {justSaved ? 'Saved.' : dirty ? 'Unsaved changes' : ''}
        </span>
      </div>
    </section>
  );
}
