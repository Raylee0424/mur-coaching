'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { WORKOUT_LOG_LIMITS } from '@coaching/shared';
import { createExerciseNote, deleteExerciseNote, updateExerciseNote } from '@/actions/exercise-notes';
import { Button } from '@/components/ui/Button';
import { FormError, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';

export interface SavedNote {
  id: string;
  body: string;
}

const AREA =
  'block w-full rounded border border-line-strong bg-canvas-low px-3 py-2 font-sans text-body text-ink placeholder:text-faint hover:border-faint';

/**
 * Persistent notes for one lift ("seat at 4", "left knee tracks in"). They follow the athlete across sessions.
 * The list comes from the server: each action revalidates the logger, so props are the source of truth.
 */
export function ExerciseNotes({ exerciseId, notes }: { exerciseId: string; notes: SavedNote[] }) {
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function open(id: string | 'new', initial: string): void {
    setEditing(id);
    setBody(initial);
    setError(undefined);
  }

  function save(): void {
    const text = body.trim();
    if (!text) {
      setError('Write a note first.');
      return;
    }
    const id = editing;
    startTransition(async () => {
      const result = id === 'new' ? await createExerciseNote(exerciseId, text) : await updateExerciseNote(id ?? '', text);
      if (result.ok) setEditing(null);
      else setError(result.error);
    });
  }

  function remove(id: string): void {
    startTransition(async () => {
      const result = await deleteExerciseNote(id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="border-l-2 border-l-sky bg-card px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-micro uppercase text-muted">Your saved notes</p>
        {editing === null ? (
          <Button variant="ghost" size="sm" onClick={() => open('new', '')}>
            <Icon icon={Plus} />
            Add note
          </Button>
        ) : null}
      </div>

      {notes.length === 0 && editing === null ? <p className="mt-1 text-meta text-faint">None for this lift yet.</p> : null}

      <ul className="mt-1 space-y-1 text-ui">
        {notes.map((n) =>
          editing === n.id ? null : (
            <li key={n.id} className="flex items-start justify-between gap-2">
              <span className="min-w-0 break-words">{n.body}</span>
              <span className="flex shrink-0">
                <Button variant="ghost" size="sm" className="w-8 px-0" aria-label="Edit note" disabled={pending} onClick={() => open(n.id, n.body)}>
                  <Icon icon={Pencil} />
                </Button>
                <Button variant="ghost" size="sm" className="w-8 px-0" aria-label="Delete note" disabled={pending} onClick={() => remove(n.id)}>
                  <Icon icon={Trash2} />
                </Button>
              </span>
            </li>
          ),
        )}
      </ul>

      {editing !== null ? (
        <div className="mt-2 space-y-2">
          <Label htmlFor="saved-note">{editing === 'new' ? 'New note for this lift' : 'Edit note'}</Label>
          <textarea
            id="saved-note"
            rows={2}
            autoFocus
            maxLength={WORKOUT_LOG_LIMITS.maxNoteLength}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="A cue or setting to remember next time."
            className={AREA}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={pending} aria-busy={pending}>
              {pending ? 'Saving…' : 'Save note'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      <FormError>{error}</FormError>
    </div>
  );
}
