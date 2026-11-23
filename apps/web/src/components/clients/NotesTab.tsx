'use client';

import { useState, useTransition } from 'react';
import { saveClientNotes } from '@/actions/clients';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { FormError, Label } from '@/components/ui/Field';

const MAX = 2000;

/** Private coach notes. The client never sees them (the API returns null notes to clients). */
export function NotesTab({ clientId, initial }: { clientId: string; initial: string }) {
  const [saved, setSaved] = useState(initial);
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string>();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const dirty = text !== saved;

  function save(): void {
    setError(undefined);
    startTransition(async () => {
      const r = await saveClientNotes(clientId, text);
      if (r.ok) {
        setSaved(text);
        toast.show({ message: 'Notes saved', tone: 'ok' });
      } else setError(r.error);
    });
  }

  return (
    <section className="max-w-3xl space-y-3">
      <div>
        <h2 className="font-sans text-ui font-semibold" style={{ fontStretch: '100%', letterSpacing: 0 }}>Private notes</h2>
        <p className="text-meta text-muted">Only you can see these. Use them for injuries, preferences and context behind your calls.</p>
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
          }}
          placeholder="e.g. Left shoulder tight on heavy pressing, keep an eye on it."
          className="block w-full rounded border border-line-strong bg-canvas-low px-3 py-2 font-sans text-body text-ink placeholder:text-faint hover:border-faint"
        />
        <p className="mt-1 text-right font-mono text-micro text-faint">
          {text.length} / {MAX}
        </p>
      </div>
      <FormError>{error}</FormError>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={!dirty || pending}>
          {pending ? 'Saving…' : 'Save notes'}
        </Button>
        <span className="text-meta text-muted">{dirty ? 'Unsaved changes' : ''}</span>
      </div>
    </section>
  );
}
