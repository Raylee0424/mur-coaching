'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { ROADMAP_LIMITS as L, validateRoadmap } from '@coaching/shared';
import type { ProgramSummaryDto, RoadmapDto, RoadmapInput } from '@coaching/shared';
import { deleteRoadmap, saveRoadmap } from '@/actions/roadmap';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { trimDecimal } from './roadmap-model';

/** Editor state for a saved roadmap, or a blank one starting today and running 12 weeks. */
export function roadmapDraft(roadmap: RoadmapDto | null, today: string): RoadmapInput {
  if (roadmap) {
    return {
      title: roadmap.title,
      notes: roadmap.notes,
      startDate: roadmap.startDate,
      endDate: roadmap.endDate,
      phases: roadmap.phases.map((p) => ({ name: p.name, focus: p.focus, startDate: p.startDate, endDate: p.endDate, programId: p.programId })),
      goals: roadmap.goals.map((g) => ({ label: g.label, unit: g.unit, targetValue: trimDecimal(g.targetValue), currentValue: g.currentValue === null ? null : trimDecimal(g.currentValue), dueDate: g.dueDate })),
      events: roadmap.events.map((e) => ({ name: e.name, date: e.date, location: e.location, notes: e.notes })),
    };
  }
  const end = new Date(Date.parse(`${today}T00:00:00.000Z`) + 12 * 7 * 86_400_000 - 86_400_000).toISOString().slice(0, 10);
  return { title: '', notes: '', startDate: today, endDate: end, phases: [], goals: [], events: [] };
}

const TEXTAREA = 'block w-full rounded border border-line-strong bg-canvas-low px-3 py-2 text-ui text-ink hover:border-faint';

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" aria-label={label} onClick={onClick}>
      <Icon icon={Trash2} />
    </Button>
  );
}

export function RoadmapEditor({ clientId, roadmap, today, programs }: { clientId: string; roadmap: RoadmapDto | null; today: string; programs: ProgramSummaryDto[] }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RoadmapInput>(() => roadmapDraft(roadmap, today));
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const set = (change: Partial<RoadmapInput>): void => setDraft((d) => ({ ...d, ...change }));
  const edit = <K extends 'phases' | 'goals' | 'events'>(key: K, index: number, change: Partial<RoadmapInput[K][number]>): void =>
    setDraft((d) => ({ ...d, [key]: d[key].map((item, i) => (i === index ? { ...item, ...change } : item)) }));
  const drop = (key: 'phases' | 'goals' | 'events', index: number): void => setDraft((d) => ({ ...d, [key]: d[key].filter((_, i) => i !== index) }));

  function show(): void {
    setDraft(roadmapDraft(roadmap, today));
    setError(undefined);
    setOpen(true);
  }

  function save(): void {
    const problem = validateRoadmap(draft);
    if (problem) return setError(problem);
    startTransition(async () => {
      const result = await saveRoadmap(clientId, draft);
      if (!result.ok) return setError(result.error);
      setOpen(false);
      toast.show({ message: 'Roadmap saved', tone: 'ok' });
    });
  }

  function remove(): void {
    if (!window.confirm('Delete this roadmap? The client loses their timeline and countdown.')) return;
    startTransition(async () => {
      const result = await deleteRoadmap(clientId);
      if (!result.ok) return setError(result.error);
      setOpen(false);
      toast.show({ message: 'Roadmap deleted', tone: 'ok' });
    });
  }

  return (
    <>
      <Button size="sm" onClick={show}>
        <Icon icon={roadmap ? Pencil : Plus} />
        {roadmap ? 'Edit roadmap' : 'Create roadmap'}
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        variant="drawer"
        title={roadmap ? 'Edit roadmap' : 'Create roadmap'}
        description="Phases run on a calendar and never overlap. Saving replaces the previous roadmap."
        footer={
          <>
            {roadmap ? (
              <Button variant="ghost" onClick={remove} disabled={pending}>
                <Icon icon={Trash2} />
                Delete
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            )}
            <Button onClick={save} disabled={pending} aria-busy={pending}>
              {pending ? 'Saving…' : 'Save roadmap'}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <div>
              <Label htmlFor="rm-title">Title</Label>
              <Input id="rm-title" value={draft.title} maxLength={L.maxTitle} onChange={(e) => set({ title: e.target.value })} placeholder="Winter meet prep" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rm-start">Starts</Label>
                <Input id="rm-start" type="date" value={draft.startDate} onChange={(e) => set({ startDate: e.target.value })} className="font-mono" />
              </div>
              <div>
                <Label htmlFor="rm-end">Ends</Label>
                <Input id="rm-end" type="date" value={draft.endDate} onChange={(e) => set({ endDate: e.target.value })} className="font-mono" />
              </div>
            </div>
            <div>
              <Label htmlFor="rm-notes">Notes for the client</Label>
              <textarea id="rm-notes" rows={3} maxLength={L.maxNotes} value={draft.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} className={TEXTAREA} />
            </div>
          </div>

          <fieldset className="space-y-3">
            <legend className="mb-1 font-mono text-micro uppercase text-muted">Phases ({draft.phases.length}/{L.maxPhases})</legend>
            {draft.phases.map((p, i) => (
              <div key={i} className="space-y-2 rounded border border-line p-3">
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={`ph-name-${i}`}>Name</Label>
                    <Input id={`ph-name-${i}`} value={p.name} maxLength={L.maxName} onChange={(e) => edit('phases', i, { name: e.target.value })} placeholder="Strength" />
                  </div>
                  <RemoveButton label={`Remove phase ${i + 1}`} onClick={() => drop('phases', i)} />
                </div>
                <div>
                  <Label htmlFor={`ph-focus-${i}`}>Focus</Label>
                  <Input id={`ph-focus-${i}`} value={p.focus ?? ''} maxLength={L.maxFocus} onChange={(e) => edit('phases', i, { focus: e.target.value })} placeholder="4-6 reps, RPE 8.5" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor={`ph-start-${i}`}>From</Label>
                    <Input id={`ph-start-${i}`} type="date" value={p.startDate} onChange={(e) => edit('phases', i, { startDate: e.target.value })} className="font-mono" />
                  </div>
                  <div>
                    <Label htmlFor={`ph-end-${i}`}>To</Label>
                    <Input id={`ph-end-${i}`} type="date" value={p.endDate} onChange={(e) => edit('phases', i, { endDate: e.target.value })} className="font-mono" />
                  </div>
                </div>
                <div>
                  <Label htmlFor={`ph-prog-${i}`}>Program (optional)</Label>
                  <Select id={`ph-prog-${i}`} value={p.programId ?? ''} onChange={(e) => edit('phases', i, { programId: e.target.value || null })}>
                    <option value="">None</option>
                    {programs.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              disabled={draft.phases.length >= L.maxPhases}
              onClick={() => setDraft((d) => ({ ...d, phases: [...d.phases, { name: '', focus: '', startDate: d.phases.at(-1)?.endDate ?? d.startDate, endDate: d.endDate, programId: null }] }))}
            >
              <Icon icon={Plus} />
              Add phase
            </Button>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="mb-1 font-mono text-micro uppercase text-muted">Goals ({draft.goals.length}/{L.maxGoals})</legend>
            {draft.goals.map((g, i) => (
              <div key={i} className="space-y-2 rounded border border-line p-3">
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={`g-label-${i}`}>Goal</Label>
                    <Input id={`g-label-${i}`} value={g.label} maxLength={L.maxName} onChange={(e) => edit('goals', i, { label: e.target.value })} placeholder="Meet total" />
                  </div>
                  <RemoveButton label={`Remove goal ${i + 1}`} onClick={() => drop('goals', i)} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor={`g-target-${i}`}>Target</Label>
                    <Input id={`g-target-${i}`} inputMode="decimal" value={g.targetValue} onChange={(e) => edit('goals', i, { targetValue: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor={`g-now-${i}`}>Now</Label>
                    <Input id={`g-now-${i}`} inputMode="decimal" value={g.currentValue ?? ''} onChange={(e) => edit('goals', i, { currentValue: e.target.value || null })} />
                  </div>
                  <div>
                    <Label htmlFor={`g-unit-${i}`}>Unit</Label>
                    <Input id={`g-unit-${i}`} value={g.unit} maxLength={L.maxUnit} onChange={(e) => edit('goals', i, { unit: e.target.value })} placeholder="kg" />
                  </div>
                </div>
                <div>
                  <Label htmlFor={`g-due-${i}`}>Due (optional)</Label>
                  <Input id={`g-due-${i}`} type="date" value={g.dueDate ?? ''} onChange={(e) => edit('goals', i, { dueDate: e.target.value || null })} className="font-mono" />
                </div>
              </div>
            ))}
            <Button variant="secondary" size="sm" disabled={draft.goals.length >= L.maxGoals} onClick={() => setDraft((d) => ({ ...d, goals: [...d.goals, { label: '', unit: 'kg', targetValue: '', currentValue: null, dueDate: null }] }))}>
              <Icon icon={Plus} />
              Add goal
            </Button>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="mb-1 font-mono text-micro uppercase text-muted">Events ({draft.events.length}/{L.maxEvents})</legend>
            {draft.events.map((e, i) => (
              <div key={i} className="space-y-2 rounded border border-line p-3">
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={`e-name-${i}`}>Event</Label>
                    <Input id={`e-name-${i}`} value={e.name} maxLength={L.maxEventName} onChange={(ev) => edit('events', i, { name: ev.target.value })} placeholder="USPA Winter Open" />
                  </div>
                  <RemoveButton label={`Remove event ${i + 1}`} onClick={() => drop('events', i)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor={`e-date-${i}`}>Date</Label>
                    <Input id={`e-date-${i}`} type="date" value={e.date} onChange={(ev) => edit('events', i, { date: ev.target.value })} className="font-mono" />
                  </div>
                  <div>
                    <Label htmlFor={`e-loc-${i}`}>Location</Label>
                    <Input id={`e-loc-${i}`} value={e.location ?? ''} maxLength={L.maxLocation} onChange={(ev) => edit('events', i, { location: ev.target.value })} />
                  </div>
                </div>
              </div>
            ))}
            <Button variant="secondary" size="sm" disabled={draft.events.length >= L.maxEvents} onClick={() => setDraft((d) => ({ ...d, events: [...d.events, { name: '', date: d.endDate, location: '', notes: '' }] }))}>
              <Icon icon={Plus} />
              Add event
            </Button>
          </fieldset>
          <FormError>{error}</FormError>
        </div>
      </Sheet>
    </>
  );
}
