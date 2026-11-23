'use client';

import clsx from 'clsx';
import { ArrowDown, ArrowUp, FolderPlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { TEMPLATE_LIMITS } from '@coaching/shared';
import type { ExerciseDto, TemplateFolderDto, WorkoutTemplateDto } from '@coaching/shared';
import {
  createTemplateFolder,
  createWorkoutTemplate,
  deleteTemplateFolder,
  deleteWorkoutTemplate,
  renameTemplateFolder,
  updateWorkoutTemplate,
} from '@/actions/templates';
import { ExercisePicker } from '@/components/programs/ExercisePicker';
import { Button, buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FieldError, FormError, Input, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import {
  draftFromTemplate,
  emptyTemplateDraft,
  exerciseSummary,
  moveExercise,
  newExerciseDraft,
  toCreateRequest,
  toUpdateRequest,
  totalSets,
  visibleTemplates,
  type TemplateDraft,
  type TemplateErrors,
} from './templates-model';

interface Props {
  folders: TemplateFolderDto[];
  /** Every template; the selected folder only filters the cards. */
  templates: WorkoutTemplateDto[];
  /** Selected folder id, or null for all templates. */
  folderId: string | null;
  catalog: ExerciseDto[];
}

type TemplateEditing = { mode: 'new' } | { mode: 'edit'; template: WorkoutTemplateDto };
type FolderEditing = { mode: 'new' } | { mode: 'rename'; folder: TemplateFolderDto };

/** Folders on the left, template cards on the right. Start Session opens the logger on that template. */
export function TemplatesManager({ folders, templates, folderId, catalog }: Props) {
  const { folder: selected, items } = visibleTemplates(templates, folders, folderId ?? undefined);
  const folderName = (id: string | null): string | null => folders.find((f) => f.id === id)?.name ?? null;

  const [editing, setEditing] = useState<TemplateEditing | null>(null);
  const [folderEditing, setFolderEditing] = useState<FolderEditing | null>(null);
  const [removing, setRemoving] = useState<{ kind: 'template'; template: WorkoutTemplateDto } | { kind: 'folder'; folder: TemplateFolderDto } | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function confirmRemove(): void {
    if (!removing) return;
    const target = removing;
    startTransition(async () => {
      const r = target.kind === 'template' ? await deleteWorkoutTemplate(target.template.id) : await deleteTemplateFolder(target.folder.id);
      setRemoving(null);
      toast.show(
        r.ok
          ? { message: target.kind === 'template' ? `Deleted ${target.template.name}` : `Deleted folder ${target.folder.name}`, tone: 'ok' }
          : { message: r.error, tone: 'error' },
      );
    });
  }

  const folderLink = (id: string | null): string => (id ? `/client/templates?folder=${id}` : '/client/templates');
  const rowClass = (active: boolean): string =>
    clsx(
      'flex h-10 items-center justify-between gap-2 rounded-sm px-3 text-ui',
      active ? 'bg-raised text-ink shadow-[inset_2px_0_0_theme(colors.signal.DEFAULT)]' : 'text-muted hover:bg-raised/60 hover:text-ink',
    );

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="Template folders" className="space-y-1">
          <p className="px-3 font-mono text-micro uppercase text-muted">Folders</p>
          <Link href={folderLink(null)} aria-current={selected ? undefined : 'page'} className={rowClass(!selected)}>
            <span>All templates</span>
            <span className="font-mono text-micro text-faint">{templates.length}</span>
          </Link>
          {folders.map((f) => (
            <Link key={f.id} href={folderLink(f.id)} aria-current={selected?.id === f.id ? 'page' : undefined} className={rowClass(selected?.id === f.id)}>
              <span className="truncate">{f.name}</span>
              <span className="font-mono text-micro text-faint">{f.templateCount}</span>
            </Link>
          ))}
          <Button variant="ghost" size="sm" className="mt-1 w-full justify-start" onClick={() => setFolderEditing({ mode: 'new' })}>
            <Icon icon={FolderPlus} />
            New folder
          </Button>
        </nav>

        <section aria-label={selected ? selected.name : 'All templates'} className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-title font-semibold">{selected ? selected.name : 'All templates'}</h2>
            <div className="flex gap-2">
              {selected ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setFolderEditing({ mode: 'rename', folder: selected })}>
                    <Icon icon={Pencil} />
                    Rename
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setRemoving({ kind: 'folder', folder: selected })}>
                    <Icon icon={Trash2} />
                    Delete folder
                  </Button>
                </>
              ) : null}
              <Button size="sm" onClick={() => setEditing({ mode: 'new' })}>
                <Icon icon={Plus} />
                New template
              </Button>
            </div>
          </div>

          {items.length === 0 ? (
            <EmptyState title="No templates here" action={<Button onClick={() => setEditing({ mode: 'new' })}>New template</Button>}>
              Build one here, or finish a session and use Save as template in the logger.
            </EmptyState>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {items.map((t) => (
                <li key={t.id} className="flex flex-col gap-3 rounded-md border border-line bg-card p-4">
                  <div className="min-w-0">
                    <p className="font-mono text-micro uppercase text-muted">{folderName(t.folderId) ?? 'No folder'}</p>
                    <h3 className="mt-1 break-words text-body font-semibold">{t.name}</h3>
                    <p className="mt-1 font-mono text-meta text-faint">
                      {t.exercises.length} {t.exercises.length === 1 ? 'exercise' : 'exercises'} · {totalSets(t)} sets
                    </p>
                    <p className="mt-2 text-meta text-muted">{exerciseSummary(t)}</p>
                    {t.notes ? <p className="mt-2 text-meta text-faint">{t.notes}</p> : null}
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <Link href={`/client/log?template=${t.id}`} className={buttonClass('primary', undefined, 'sm')}>
                      Start session
                    </Link>
                    <span className="flex">
                      <Button variant="ghost" size="sm" className="w-8 px-0" aria-label={`Edit ${t.name}`} onClick={() => setEditing({ mode: 'edit', template: t })}>
                        <Icon icon={Pencil} />
                      </Button>
                      <Button variant="ghost" size="sm" className="w-8 px-0" aria-label={`Delete ${t.name}`} onClick={() => setRemoving({ kind: 'template', template: t })}>
                        <Icon icon={Trash2} />
                      </Button>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {editing ? <TemplateSheet editing={editing} folders={folders} catalog={catalog} defaultFolderId={selected?.id ?? ''} onClose={() => setEditing(null)} /> : null}
      {folderEditing ? <FolderSheet editing={folderEditing} onClose={() => setFolderEditing(null)} /> : null}

      {removing ? (
        <Sheet
          open
          onClose={() => setRemoving(null)}
          title={removing.kind === 'template' ? 'Delete template?' : 'Delete folder?'}
          description={
            removing.kind === 'template'
              ? `${removing.template.name} will be removed. Logged sessions are not affected.`
              : `${removing.folder.name} will be removed. Its templates stay, with no folder.`
          }
          variant="bottom"
          footer={
            <>
              <Button variant="ghost" onClick={() => setRemoving(null)} disabled={pending}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmRemove} disabled={pending}>
                {pending ? 'Deleting…' : 'Delete'}
              </Button>
            </>
          }
        >
          <p className="text-ui text-muted">This cannot be undone.</p>
        </Sheet>
      ) : null}
    </>
  );
}

function FolderSheet({ editing, onClose }: { editing: FolderEditing; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(editing.mode === 'rename' ? editing.folder.name : '');
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function save(): void {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name the folder.');
      return;
    }
    startTransition(async () => {
      const r = editing.mode === 'rename' ? await renameTemplateFolder(editing.folder.id, trimmed) : await createTemplateFolder(trimmed);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast.show({ message: editing.mode === 'rename' ? 'Folder renamed' : `Created folder ${r.data.name}`, tone: 'ok' });
      onClose();
    });
  }

  return (
    <Sheet
      open
      onClose={onClose}
      variant="bottom"
      title={editing.mode === 'rename' ? 'Rename folder' : 'New folder'}
      form={{
        onSubmit: (e) => {
          e.preventDefault();
          save();
        },
      }}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <Label htmlFor="folder-name">Name</Label>
      <Input id="folder-name" value={name} autoFocus maxLength={TEMPLATE_LIMITS.maxNameLength} onChange={(e) => setName(e.target.value)} placeholder="Travel" />
      <FormError>{error}</FormError>
    </Sheet>
  );
}

function TemplateSheet({
  editing,
  folders,
  catalog,
  defaultFolderId,
  onClose,
}: {
  editing: TemplateEditing;
  folders: TemplateFolderDto[];
  catalog: ExerciseDto[];
  defaultFolderId: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState<TemplateDraft>(() => (editing.mode === 'edit' ? draftFromTemplate(editing.template) : emptyTemplateDraft(defaultFolderId)));
  const [errors, setErrors] = useState<TemplateErrors>({});
  const [formError, setFormError] = useState<string>();
  const [picking, setPicking] = useState(false);
  const [pending, startTransition] = useTransition();

  const patch = (p: Partial<TemplateDraft>): void => setDraft((d) => ({ ...d, ...p }));
  const patchRow = (key: string, p: Partial<TemplateDraft['exercises'][number]>): void =>
    setDraft((d) => ({ ...d, exercises: d.exercises.map((e) => (e.key === key ? { ...e, ...p } : e)) }));

  function save(): void {
    const result = editing.mode === 'edit' ? toUpdateRequest(draft) : toCreateRequest(draft);
    if (!result.ok) {
      setErrors(result.errors);
      setFormError('Fix the highlighted fields.');
      return;
    }
    setErrors({});
    setFormError(undefined);
    startTransition(async () => {
      const r =
        editing.mode === 'edit'
          ? await updateWorkoutTemplate(editing.template.id, result.request)
          : await createWorkoutTemplate(result.request as Parameters<typeof createWorkoutTemplate>[0]);
      if (!r.ok) {
        setFormError(r.error);
        return;
      }
      toast.show({ message: editing.mode === 'edit' ? 'Template saved' : `Created ${r.data.name}`, tone: 'ok' });
      onClose();
    });
  }

  const num = 'w-16';
  return (
    <>
      <Sheet
        open
        onClose={onClose}
        variant="drawer"
        title={editing.mode === 'edit' ? 'Edit template' : 'New template'}
        form={{
          onSubmit: (e) => {
            e.preventDefault();
            save();
          },
        }}
        footer={
          <>
            <Button variant="ghost" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {pending ? 'Saving…' : 'Save template'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="tpl-name">Name</Label>
            <Input id="tpl-name" value={draft.name} maxLength={TEMPLATE_LIMITS.maxNameLength} aria-invalid={Boolean(errors['name'])} onChange={(e) => patch({ name: e.target.value })} />
            <FieldError>{errors['name']}</FieldError>
          </div>
          <div>
            <Label htmlFor="tpl-folder">Folder</Label>
            <Select id="tpl-folder" value={draft.folderId} onChange={(e) => patch({ folderId: e.target.value })}>
              <option value="">No folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="tpl-notes">Notes (optional)</Label>
            <textarea
              id="tpl-notes"
              rows={2}
              maxLength={1000}
              value={draft.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              className="block w-full rounded border border-line-strong bg-canvas-low px-3 py-2 font-sans text-body text-ink placeholder:text-faint hover:border-faint"
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="font-mono text-micro uppercase text-muted">Exercises ({draft.exercises.length})</legend>
            {draft.exercises.map((e, i) => {
              const err = (k: string): string | undefined => errors[`ex.${i}.${k}`];
              const id = (k: string): string => `tpl-${e.key}-${k}`;
              return (
                <div key={e.key} className="space-y-2 rounded-md border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 break-words text-ui font-medium">{e.name}</span>
                    <span className="flex shrink-0">
                      <Button variant="ghost" size="sm" className="w-8 px-0" aria-label={`Move ${e.name} up`} disabled={i === 0} onClick={() => setDraft((d) => moveExercise(d, e.key, -1))}>
                        <Icon icon={ArrowUp} />
                      </Button>
                      <Button variant="ghost" size="sm" className="w-8 px-0" aria-label={`Move ${e.name} down`} disabled={i === draft.exercises.length - 1} onClick={() => setDraft((d) => moveExercise(d, e.key, 1))}>
                        <Icon icon={ArrowDown} />
                      </Button>
                      <Button variant="ghost" size="sm" className="w-8 px-0" aria-label={`Remove ${e.name}`} onClick={() => setDraft((d) => ({ ...d, exercises: d.exercises.filter((x) => x.key !== e.key) }))}>
                        <Icon icon={X} />
                      </Button>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div>
                      <Label htmlFor={id('sets')}>Sets</Label>
                      <Input id={id('sets')} className={num} inputMode="numeric" value={e.targetSets} aria-invalid={Boolean(err('sets'))} onChange={(ev) => patchRow(e.key, { targetSets: ev.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor={id('min')}>Reps min</Label>
                      <Input id={id('min')} className={num} inputMode="numeric" value={e.repsMin} aria-invalid={Boolean(err('repsMin'))} onChange={(ev) => patchRow(e.key, { repsMin: ev.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor={id('max')}>Reps max</Label>
                      <Input id={id('max')} className={num} inputMode="numeric" value={e.repsMax} aria-invalid={Boolean(err('repsMax'))} onChange={(ev) => patchRow(e.key, { repsMax: ev.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor={id('rest')}>Rest (s)</Label>
                      <Input id={id('rest')} className={num} inputMode="numeric" value={e.restSeconds} aria-invalid={Boolean(err('rest'))} onChange={(ev) => patchRow(e.key, { restSeconds: ev.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor={id('tempo')}>Tempo</Label>
                      <Input id={id('tempo')} className="w-24" value={e.tempo} maxLength={7} placeholder="3-1-1-0" aria-invalid={Boolean(err('tempo'))} onChange={(ev) => patchRow(e.key, { tempo: ev.target.value })} />
                    </div>
                  </div>
                  <FieldError>{err('sets') ?? err('repsMin') ?? err('repsMax') ?? err('rest') ?? err('tempo')}</FieldError>
                </div>
              );
            })}
            <FieldError>{errors['exercises']}</FieldError>
            <Button variant="secondary" onClick={() => setPicking(true)}>
              <Icon icon={Plus} />
              Add exercise
            </Button>
          </fieldset>
          <FormError>{formError}</FormError>
        </div>
      </Sheet>
      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        library={catalog}
        targetLabel="this template"
        addedNames={new Set(draft.exercises.map((e) => e.name))}
        onPick={(ex) => setDraft((d) => ({ ...d, exercises: [...d.exercises, newExerciseDraft(ex)] }))}
      />
    </>
  );
}
