'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { TEMPLATE_LIMITS } from '@coaching/shared';
import type { TemplateExerciseInput, TemplateFolderDto, WorkoutTemplateDto } from '@coaching/shared';
import { createWorkoutTemplate } from '@/actions/templates';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';

/** Templates grouped by folder; picking one adds its exercises to the session. */
export function TemplatePickerSheet({
  open,
  onClose,
  folders,
  templates,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  folders: TemplateFolderDto[];
  templates: WorkoutTemplateDto[];
  onPick: (template: WorkoutTemplateDto) => void;
}) {
  const groups = useMemo(() => {
    const named = folders.map((f) => ({ id: f.id, name: f.name, items: templates.filter((t) => t.folderId === f.id) }));
    return [{ id: 'none', name: 'No folder', items: templates.filter((t) => t.folderId === null) }, ...named].filter((g) => g.items.length > 0);
  }, [folders, templates]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      variant="drawer"
      title="Start from a template"
      description="Adds the template's exercises to this session."
      footer={
        <>
          <Link href="/client/templates" className="text-ui text-signal hover:underline">
            Manage templates
          </Link>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      {groups.length === 0 ? (
        <EmptyState title="No templates yet">Log a session, then save it as a template to reuse it.</EmptyState>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.id} aria-label={g.name}>
              <h3 className="mb-2 font-mono text-micro uppercase text-muted">{g.name}</h3>
              <ul className="divide-y divide-line rounded-md border border-line">
                {g.items.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => onPick(t)}
                      className="flex min-h-12 w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-raised focus-visible:-outline-offset-2"
                    >
                      <span className="text-ui font-medium">{t.name}</span>
                      <span className="text-meta text-muted">
                        {t.exercises.length} {t.exercises.length === 1 ? 'exercise' : 'exercises'} ·{' '}
                        {t.exercises.map((e) => e.exerciseName).join(', ')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Sheet>
  );
}

/** Saves the session so far (exercises, working-set counts, rep ranges, measured rest) as a template. */
export function SaveTemplateSheet({
  open,
  onClose,
  folders,
  exercises,
}: {
  open: boolean;
  onClose: () => void;
  folders: TemplateFolderDto[];
  exercises: TemplateExerciseInput[];
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [folderId, setFolderId] = useState('');
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function save(): void {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name the template.');
      return;
    }
    if (exercises.length === 0) {
      setError('Log at least one set first.');
      return;
    }
    startTransition(async () => {
      const result = await createWorkoutTemplate({ name: trimmed, ...(folderId ? { folderId } : {}), exercises });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.show({ message: `Saved template ${result.data.name}`, tone: 'ok' });
      setName('');
      setError(undefined);
      onClose();
    });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      variant="bottom"
      title="Save as template"
      description={`${exercises.length} ${exercises.length === 1 ? 'exercise' : 'exercises'} from this session.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending} aria-busy={pending}>
            {pending ? 'Saving…' : 'Save template'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="tpl-name">Name</Label>
          <Input id="tpl-name" value={name} maxLength={TEMPLATE_LIMITS.maxNameLength} onChange={(e) => setName(e.target.value)} placeholder="Upper strength A" />
        </div>
        <div>
          <Label htmlFor="tpl-folder">Folder (optional)</Label>
          <Select id="tpl-folder" value={folderId} onChange={(e) => setFolderId(e.target.value)}>
            <option value="">No folder</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        </div>
        <FormError>{error}</FormError>
      </div>
    </Sheet>
  );
}
