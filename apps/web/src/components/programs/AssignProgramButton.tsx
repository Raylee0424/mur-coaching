'use client';

import { Check, UserPlus, X } from 'lucide-react';
import { useEffect, useId, useState, useTransition } from 'react';
import type { ClientGroupDto, ClientProgramConflictsDto } from '@coaching/shared';
import { assignProgram, assignProgramToGroup, deleteClientGroup, programConflicts, saveClientGroup, type AssignOutcome } from '@/actions/programs';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { ProgramConflicts } from './ProgramConflicts';

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
  groups: initialGroups = [],
  affectedClientIds = [],
  disabledReason,
}: {
  programId: string;
  programName: string;
  clients: AssignableClient[];
  /** The coach's saved client groups, for bulk assignment. */
  groups?: ClientGroupDto[];
  /** Clients already on this program; shown so the coach knows who later edits reach. */
  affectedClientIds?: string[];
  /** Shown instead of opening when assigning is not possible (e.g. unsaved changes). */
  disabledReason: string | null;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<'clients' | 'group'>('clients');
  const [groups, setGroups] = useState(initialGroups);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [error, setError] = useState<string>();
  const [outcomes, setOutcomes] = useState<AssignOutcome[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [conflicts, setConflicts] = useState<ClientProgramConflictsDto[]>([]);

  // Advisory check against the selected clients' active limitations. Stale responses are dropped.
  const group = groups.find((g) => g.id === groupId) ?? null;
  // Who the assignment touches: the picked clients, or every member of the chosen group.
  const targetIds = mode === 'group' ? (group?.memberIds ?? []) : selected;
  const selectedKey = targetIds.join(',');
  useEffect(() => {
    if (!open || outcomes || selectedKey === '') {
      setConflicts([]);
      return;
    }
    let live = true;
    void programConflicts(programId, selectedKey.split(',')).then((r) => {
      if (live) setConflicts(r.ok ? r.data : []);
    });
    return () => {
      live = false;
    };
  }, [open, outcomes, programId, selectedKey]);

  const losing = clients.filter((c) => targetIds.includes(c.id) && c.currentProgram && c.currentProgram.id !== programId);

  function openSheet(): void {
    setSelected([]);
    setMode('clients');
    setGroupId(null);
    setGroupName('');
    setStartDate(nextMonday());
    setError(undefined);
    setOutcomes(null);
    setOpen(true);
  }

  function submit(): void {
    setError(undefined);
    startTransition(async () => {
      const r = mode === 'group' && groupId ? await assignProgramToGroup(programId, groupId, startDate) : await assignProgram(programId, selected, startDate);
      if (!r.ok) setError(r.error);
      else setOutcomes(r.data);
    });
  }

  function saveGroup(): void {
    setError(undefined);
    startTransition(async () => {
      const r = await saveClientGroup(null, groupName, selected);
      if (!r.ok) return setError(r.error);
      setGroups((g) => [...g, r.data].sort((a, b) => a.name.localeCompare(b.name)));
      setGroupName('');
      setGroupId(r.data.id);
      setMode('group');
    });
  }

  function removeGroup(id: string): void {
    setError(undefined);
    startTransition(async () => {
      const r = await deleteClientGroup(id);
      if (!r.ok) return setError(r.error);
      setGroups((g) => g.filter((x) => x.id !== id));
      if (groupId === id) setGroupId(null);
    });
  }

  const nameOf = (clientId: string) => clients.find((c) => c.id === clientId)?.name ?? clientId;

  const footer = outcomes ? (
    <>
      <span />
      <Button onClick={() => setOpen(false)}>Done</Button>
    </>
  ) : (
    <>
      <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
        Cancel
      </Button>
      <Button onClick={submit} disabled={pending || targetIds.length === 0 || !startDate}>
        {pending ? 'Assigning…' : `Assign to ${targetIds.length || ''} ${targetIds.length === 1 ? 'client' : 'clients'}`.replace('  ', ' ')}
      </Button>
    </>
  );

  return (
    <>
      <Button variant="secondary" size="sm" onClick={openSheet} disabled={disabledReason !== null} title={disabledReason ?? undefined}>
        <Icon icon={UserPlus} />
        Assign to clients
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Assign program" description={programName} footer={footer}>
        {outcomes ? (
          <ul className="space-y-2 text-ui">
            {outcomes.map((o) => (
              <li key={o.clientId} className={`flex items-start gap-2 ${o.ok ? 'text-emerald' : 'text-danger'}`}>
                <Icon icon={o.ok ? Check : X} />
                <span>
                  {nameOf(o.clientId)}
                  {o.ok ? <span className="font-mono"> starts {startDate}</span> : `: ${o.error}`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-4">
            <div role="group" aria-label="Assign to" className="inline-flex h-9 items-center gap-0.5 rounded border border-line bg-canvas-low p-0.5">
              {(['clients', 'group'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className={`inline-flex h-7 items-center rounded-sm px-3 text-ui transition-colors ${mode === m ? 'bg-raised text-ink' : 'text-muted hover:text-ink'}`}
                >
                  {m === 'clients' ? 'Clients' : `Groups (${groups.length})`}
                </button>
              ))}
            </div>
            {mode === 'group' ? (
              groups.length === 0 ? (
                <p className="text-ui text-muted">No groups yet. Pick clients on the Clients tab, name the group and save it.</p>
              ) : (
                <fieldset className="space-y-1">
                  <legend className="mb-1.5 font-mono text-micro uppercase text-muted">Group</legend>
                  <div className="divide-y divide-line rounded-md border border-line">
                    {groups.map((g) => (
                      <div key={g.id} className="flex min-h-11 items-center gap-3 px-3 py-2 hover:bg-raised/60">
                        <label className="flex flex-1 cursor-pointer items-center gap-3">
                          <input type="radio" name={`${id}-group`} className="size-4" checked={groupId === g.id} onChange={() => setGroupId(g.id)} />
                          <span className="flex-1">
                            <span className="block text-ui font-medium">{g.name}</span>
                            <span className="block text-meta text-muted">{g.memberIds.map((m) => nameOf(m)).join(', ') || 'No members'}</span>
                          </span>
                        </label>
                        <Button variant="ghost" size="sm" aria-label={`Delete group ${g.name}`} onClick={() => removeGroup(g.id)} disabled={pending}>
                          <Icon icon={X} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </fieldset>
              )
            ) : clients.length === 0 ? (
              <p className="text-ui text-muted">No active clients to assign.</p>
            ) : (
              <fieldset className="space-y-1">
                <legend className="mb-1.5 font-mono text-micro uppercase text-muted">Clients</legend>
                <div className="divide-y divide-line rounded-md border border-line">
                  {clients.map((c) => (
                    <label key={c.id} className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-raised/60">
                      <input
                        type="checkbox"
                        className="size-4 rounded-sm"
                        checked={selected.includes(c.id)}
                        onChange={(e) => setSelected((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))}
                      />
                      <span className="flex-1">
                        <span className="block text-ui font-medium">{c.name}</span>
                        <span className="block text-meta text-muted">{c.currentProgram ? `Currently: ${c.currentProgram.name}` : 'No program'}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {mode === 'clients' && selected.length > 1 ? (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor={`${id}-group-name`}>Save these {selected.length} as a group</Label>
                  <Input id={`${id}-group-name`} value={groupName} maxLength={60} placeholder="e.g. Powerlifting cohort" onChange={(e) => setGroupName(e.target.value)} />
                </div>
                <Button variant="secondary" onClick={saveGroup} disabled={pending || !groupName.trim()}>
                  Save group
                </Button>
              </div>
            ) : null}
            <div>
              <Label htmlFor={`${id}-start`}>Start date</Label>
              <Input id={`${id}-start`} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="font-mono" />
            </div>
            {losing.length > 0 ? (
              <p role="status" className="border-l-2 border-l-amber bg-amber-bg px-3 py-2 text-ui text-amber">
                {targetIds.length} {targetIds.length === 1 ? 'client' : 'clients'} selected; {losing.length} will lose their current program (
                {losing.map((c) => c.currentProgram?.name).join(', ')}). Their logged history stays.
              </p>
            ) : null}
            {affectedClientIds.length > 0 ? (
              <p className="text-meta text-muted">
                Later edits to this program reach {affectedClientIds.length} {affectedClientIds.length === 1 ? 'client' : 'clients'} already on it ({affectedClientIds.map(nameOf).join(', ')}): future sessions update, logged sessions never change.
              </p>
            ) : null}
            <ProgramConflicts conflicts={conflicts} note="You can still assign. Flags show on the client's Today and logger, and swaps sort safest first." />
            <FormError>{error}</FormError>
          </div>
        )}
      </Sheet>
    </>
  );
}
