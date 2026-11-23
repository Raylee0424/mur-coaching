'use client';

import clsx from 'clsx';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useId, useMemo, useState, useTransition } from 'react';
import { LIMITATION_SEVERITY_LABELS, LimitationSeverity, LimitationTarget, MUSCLE_GROUP_LABELS, MuscleGroup } from '@coaching/shared';
import type { LimitationDto } from '@coaching/shared';
import { createLimitation, deleteLimitation, updateLimitation } from '@/actions/limitations';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FieldError, FormError, Input, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { TABLE, TD, TH, THEAD, TR } from '@/components/ui/table';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/format';
import { LimitationBadge } from './LimitationBadge';
import {
  draftFrom,
  emptyDraft,
  sortLimitations,
  statusOf,
  targetLabel,
  validateDraft,
  type LimitationDraft,
  type LimitationErrors,
} from './limitations-model';

export interface ExerciseOption {
  id: string;
  name: string;
}

interface Props {
  clientId: string;
  limitations: LimitationDto[];
  exercises: ExerciseOption[];
  /** `YYYY-MM-DD`, from the server so SSR and hydration agree. */
  today: string;
  /** Phone-first controls for the client's own screen. */
  large?: boolean;
}

type Editing = { mode: 'new' } | { mode: 'edit'; limitation: LimitationDto } | null;

/** Injuries and limitations. They flag prescriptions and sort swaps; they never block logging. */
export function LimitationsPanel({ clientId, limitations, exercises, today, large }: Props) {
  const toast = useToast();
  const [editing, setEditing] = useState<Editing>(null);
  const [removing, setRemoving] = useState<LimitationDto | null>(null);
  const [pending, startTransition] = useTransition();
  const rows = useMemo(() => sortLimitations(limitations, today), [limitations, today]);
  const size = large ? 'lg' : 'sm';

  function remove(): void {
    if (!removing) return;
    const target = removing;
    startTransition(async () => {
      const r = await deleteLimitation(clientId, target.id);
      setRemoving(null);
      toast.show(r.ok ? { message: `Removed ${targetLabel(target)} limitation`, tone: 'ok' } : { message: r.error, tone: 'error' });
    });
  }

  return (
    <>
      <Panel
        title="Injuries and limitations"
        meta={`${rows.filter((l) => statusOf(l, today) === 'active').length} active`}
        actions={
          <Button variant="secondary" size={size} onClick={() => setEditing({ mode: 'new' })}>
            <Icon icon={Plus} />
            Add
          </Button>
        }
      >
        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No limitations">Add an injury to flag affected exercises and sort safer swaps first.</EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={clsx(TABLE, 'min-w-[36rem]')}>
              <caption className="sr-only">Injuries and limitations</caption>
              <thead className={THEAD}>
                <tr>
                  <th scope="col" className={TH}>Affects</th>
                  <th scope="col" className={TH}>Level</th>
                  <th scope="col" className={TH}>From</th>
                  <th scope="col" className={TH}>Until</th>
                  <th scope="col" className={TH}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => {
                  const status = statusOf(l, today);
                  return (
                    <tr key={l.id} className={clsx(TR, status !== 'active' && 'text-faint')}>
                      <td className={clsx(TD, 'h-auto py-2')}>
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={status === 'active' ? 'font-medium text-ink' : ''}>{targetLabel(l)}</span>
                          {status !== 'active' ? <Badge tone="slate">{status === 'ended' ? 'Ended' : 'Upcoming'}</Badge> : null}
                        </span>
                        {l.note ? <span className="block text-meta text-muted">{l.note}</span> : null}
                      </td>
                      <td className={TD}>
                        {status === 'active' ? <LimitationBadge flag={{ severity: l.severity, note: l.note }} /> : <span className="text-meta">{LIMITATION_SEVERITY_LABELS[l.severity]}</span>}
                      </td>
                      <td className={clsx(TD, 'font-mono')}>{formatDate(l.startsOn)}</td>
                      <td className={clsx(TD, 'font-mono')}>{l.endsOn ? formatDate(l.endsOn) : 'Open'}</td>
                      <td className={TD}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size={size} className="w-8 px-0" aria-label={`Edit ${targetLabel(l)} limitation`} onClick={() => setEditing({ mode: 'edit', limitation: l })}>
                            <Icon icon={Pencil} />
                          </Button>
                          <Button variant="ghost" size={size} className="w-8 px-0" aria-label={`Remove ${targetLabel(l)} limitation`} onClick={() => setRemoving(l)}>
                            <Icon icon={Trash2} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {editing ? (
        <LimitationSheet clientId={clientId} editing={editing} exercises={exercises} today={today} large={large} onClose={() => setEditing(null)} />
      ) : null}

      {removing ? (
        <Sheet
          open
          onClose={() => setRemoving(null)}
          title="Remove limitation?"
          description={`${targetLabel(removing)} will no longer be flagged.`}
          variant="bottom"
          footer={
            <>
              <Button variant="ghost" onClick={() => setRemoving(null)} disabled={pending}>
                Cancel
              </Button>
              <Button variant="danger" onClick={remove} disabled={pending}>
                {pending ? 'Removing…' : 'Remove'}
              </Button>
            </>
          }
        >
          <p className="text-ui text-muted">To keep the history, set an end date instead.</p>
        </Sheet>
      ) : null}
    </>
  );
}

function LimitationSheet({
  clientId,
  editing,
  exercises,
  today,
  large,
  onClose,
}: {
  clientId: string;
  editing: NonNullable<Editing>;
  exercises: ExerciseOption[];
  today: string;
  large: boolean | undefined;
  onClose: () => void;
}) {
  const id = useId();
  const toast = useToast();
  const existing = editing.mode === 'edit' ? editing.limitation : null;
  const [draft, setDraft] = useState<LimitationDraft>(() => (existing ? draftFrom(existing) : emptyDraft(today)));
  const [errors, setErrors] = useState<LimitationErrors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const control = large ? 'lg' : 'md';
  const patch = (p: Partial<LimitationDraft>) => {
    setDraft((d) => ({ ...d, ...p }));
    setErrors({});
  };

  function save(): void {
    const v = validateDraft(draft);
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    setFormError(undefined);
    startTransition(async () => {
      const r = existing
        ? await updateLimitation(clientId, existing.id, {
            severity: v.request.severity,
            note: v.request.note ?? null,
            startsOn: v.request.startsOn as string,
            endsOn: v.request.endsOn ?? null,
          })
        : await createLimitation(clientId, v.request);
      if (r.ok) {
        toast.show({ message: existing ? 'Limitation updated' : 'Limitation added', tone: 'ok' });
        onClose();
      } else setFormError(r.error);
    });
  }

  return (
    <Sheet
      open
      onClose={onClose}
      variant={large ? 'bottom' : 'drawer'}
      title={existing ? 'Edit limitation' : 'Add limitation'}
      description="Flags matching exercises and sorts safer swaps first. Logging is never blocked."
      form={{
        noValidate: true,
        onSubmit: (e) => {
          e.preventDefault();
          save();
        },
      }}
      footer={
        <>
          <Button variant="ghost" size={control} onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" size={control} disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {existing ? (
          <p className="text-ui text-muted">
            Affects <span className="font-medium text-ink">{targetLabel(existing)}</span>. Remove and re-add to change what it affects.
          </p>
        ) : (
          <>
            <fieldset>
              <legend className="mb-1.5 font-mono text-micro uppercase text-muted">Affects</legend>
              <div className="flex gap-0.5 rounded border border-line bg-canvas-low p-0.5">
                {([LimitationTarget.MUSCLE, LimitationTarget.EXERCISE] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={draft.target === t}
                    onClick={() => patch({ target: t })}
                    className={clsx('h-9 flex-1 rounded-sm text-ui', draft.target === t ? 'bg-raised text-ink' : 'text-muted hover:text-ink')}
                  >
                    {t === LimitationTarget.MUSCLE ? 'Muscle group' : 'One exercise'}
                  </button>
                ))}
              </div>
            </fieldset>
            {draft.target === LimitationTarget.MUSCLE ? (
              <div>
                <Label htmlFor={`${id}-muscle`}>Muscle group</Label>
                <Select id={`${id}-muscle`} size={control} value={draft.muscleGroup} aria-invalid={errors.muscleGroup ? true : undefined} onChange={(e) => patch({ muscleGroup: e.target.value as MuscleGroup })}>
                  <option value="" disabled>
                    Choose…
                  </option>
                  {Object.values(MuscleGroup).map((g) => (
                    <option key={g} value={g}>
                      {MUSCLE_GROUP_LABELS[g]}
                    </option>
                  ))}
                </Select>
                <FieldError>{errors.muscleGroup}</FieldError>
              </div>
            ) : (
              <div>
                <Label htmlFor={`${id}-exercise`}>Exercise</Label>
                <Select id={`${id}-exercise`} size={control} value={draft.exerciseId} aria-invalid={errors.exerciseId ? true : undefined} onChange={(e) => patch({ exerciseId: e.target.value })}>
                  <option value="" disabled>
                    Choose…
                  </option>
                  {exercises.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </Select>
                <FieldError>{errors.exerciseId}</FieldError>
              </div>
            )}
          </>
        )}

        <fieldset>
          <legend className="mb-1.5 font-mono text-micro uppercase text-muted">Level</legend>
          <div className="flex gap-0.5 rounded border border-line bg-canvas-low p-0.5">
            {([LimitationSeverity.CAUTION, LimitationSeverity.AVOID] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={draft.severity === s}
                onClick={() => patch({ severity: s })}
                className={clsx('h-9 flex-1 rounded-sm text-ui', draft.severity === s ? 'bg-raised text-ink' : 'text-muted hover:text-ink')}
              >
                {LIMITATION_SEVERITY_LABELS[s]}
              </button>
            ))}
          </div>
          <p className="mt-1 text-meta text-muted">Caution: train with care. Avoid: pick a swap if you can.</p>
        </fieldset>

        <div>
          <Label htmlFor={`${id}-note`}>Note (optional)</Label>
          <Input id={`${id}-note`} size={control} maxLength={500} value={draft.note} placeholder="e.g. left shoulder, pain overhead" onChange={(e) => patch({ note: e.target.value })} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={`${id}-start`}>From</Label>
            <Input id={`${id}-start`} size={control} type="date" className="font-mono" value={draft.startsOn} aria-invalid={errors.startsOn ? true : undefined} onChange={(e) => patch({ startsOn: e.target.value })} />
            <FieldError>{errors.startsOn}</FieldError>
          </div>
          <div>
            <Label htmlFor={`${id}-end`}>Until (optional)</Label>
            <Input id={`${id}-end`} size={control} type="date" className="font-mono" value={draft.endsOn} aria-invalid={errors.endsOn ? true : undefined} onChange={(e) => patch({ endsOn: e.target.value })} />
            <FieldError>{errors.endsOn}</FieldError>
          </div>
        </div>
        <FormError>{formError}</FormError>
      </div>
    </Sheet>
  );
}
