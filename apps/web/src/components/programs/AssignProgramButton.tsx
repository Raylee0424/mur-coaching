'use client';

import { useId, useState, useTransition } from 'react';
import { assignProgram, type AssignOutcome } from '@/actions/programs';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';

export interface AssignableClient {
  id: string;
  name: string;
  currentProgram: { id: string; name: string } | null;
}

/** Next Monday as YYYY-MM-DD in the browser's timezone. */
function nextMonday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function AssignProgramButton({
  programId,
  programName,
  clients,
  disabledReason,
}: {
  programId: string;
  programName: string;
  clients: AssignableClient[];
  /** Shown instead of opening when assigning is not possible (e.g. unsaved changes). */
  disabledReason: string | null;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [error, setError] = useState<string>();
  const [outcomes, setOutcomes] = useState<AssignOutcome[] | null>(null);
  const [pending, startTransition] = useTransition();

  const losing = clients.filter((c) => selected.includes(c.id) && c.currentProgram && c.currentProgram.id !== programId);

  function openSheet(): void {
    setSelected([]);
    setStartDate(nextMonday());
    setError(undefined);
    setOutcomes(null);
    setOpen(true);
  }

  function submit(): void {
    setError(undefined);
    startTransition(async () => {
      const r = await assignProgram(programId, selected, startDate);
      if (!r.ok) setError(r.error);
      else setOutcomes(r.data);
    });
  }

  const nameOf = (clientId: string) => clients.find((c) => c.id === clientId)?.name ?? clientId;

  return (
    <>
      <Button variant="secondary" onClick={openSheet} disabled={disabledReason !== null} title={disabledReason ?? undefined}>
        Assign to clients
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Assign program" description={programName}>
        {outcomes ? (
          <div className="space-y-4">
            <ul className="space-y-2 text-sm">
              {outcomes.map((o) => (
                <li key={o.clientId} className={o.ok ? 'text-emerald' : 'text-danger'}>
                  {o.ok ? '✓' : '✕'} {nameOf(o.clientId)}
                  {o.ok ? ` starts ${startDate}` : `: ${o.error}`}
                </li>
              ))}
            </ul>
            <div className="flex justify-end">
              <Button onClick={() => setOpen(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {clients.length === 0 ? (
              <p className="text-sm text-muted">No active clients to assign.</p>
            ) : (
              <fieldset className="space-y-2">
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Clients</legend>
                {clients.map((c) => (
                  <label key={c.id} className="flex min-h-11 items-center gap-3 rounded-md border border-line px-3 py-2">
                    <input
                      type="checkbox"
                      className="size-5 accent-primary"
                      checked={selected.includes(c.id)}
                      onChange={(e) =>
                        setSelected((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))
                      }
                    />
                    <span className="flex-1">
                      <span className="block text-sm font-semibold">{c.name}</span>
                      <span className="block text-xs text-muted">
                        {c.currentProgram ? `Currently: ${c.currentProgram.name}` : 'No program'}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
            <div>
              <Label htmlFor={`${id}-start`}>Start date</Label>
              <Input id={`${id}-start`} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            {losing.length > 0 ? (
              <p role="status" className="rounded-md border border-amber/40 bg-amber-bg px-3 py-2 text-sm text-amber">
                {selected.length} {selected.length === 1 ? 'client' : 'clients'} selected; {losing.length} will lose their
                current program ({losing.map((c) => c.currentProgram?.name).join(', ')}). Their logged history stays.
              </p>
            ) : null}
            <FormError>{error}</FormError>
            <footer className="flex justify-between gap-2 border-t border-line pt-4">
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={pending || selected.length === 0 || !startDate}>
                {pending ? 'Assigning…' : `Assign to ${selected.length || ''} ${selected.length === 1 ? 'client' : 'clients'}`.replace('  ', ' ')}
              </Button>
            </footer>
          </div>
        )}
      </Sheet>
    </>
  );
}
