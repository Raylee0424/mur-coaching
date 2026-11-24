'use client';

import clsx from 'clsx';
import { CornerDownRight, Pencil, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import type { CreateSessionFeedbackRequest, SessionFeedbackDto } from '@coaching/shared';
import { SESSION_FEEDBACK_LIMITS } from '@coaching/shared';
import { addFeedback, removeFeedback, updateFeedback } from '@/actions/session-review';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormError, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';

const AREA =
  'block w-full rounded-sm border border-line bg-canvas-low px-3.5 py-2.5 text-ui text-ink placeholder:text-muted transition-colors hover:border-line-strong focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

/**
 * Coach comments at one scope (session, lift or set): the existing ones, then a form for a new one.
 * "Carry forward" pins a comment to the client's next matching session in their Today feed.
 */
export function FeedbackThread({
  clientId,
  logId,
  items,
  scope,
  id,
  label,
  carryLabel,
  compact = false,
}: {
  clientId: string;
  logId: string;
  items: SessionFeedbackDto[];
  /** Where a new comment attaches. */
  scope: Pick<CreateSessionFeedbackRequest, 'exerciseLogId' | 'setLogId'>;
  /** Unique per thread, for label/field ids. */
  id: string;
  label: string;
  carryLabel: string;
  compact?: boolean;
}) {
  const [body, setBody] = useState('');
  const [carry, setCarry] = useState(false);
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const [error, setError] = useState<string>();
  const [open, setOpen] = useState(!compact);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void): void => {
    setError(undefined);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error);
      else after?.();
    });
  };

  const submit = (): void =>
    run(
      () => addFeedback(clientId, logId, { ...scope, body, carryForward: carry }),
      () => {
        setBody('');
        setCarry(false);
        if (compact) setOpen(false);
      },
    );

  return (
    <div className="space-y-2">
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((f) => (
            <li key={f.id} className="rounded-md border border-line bg-canvas-low p-3">
              {editing?.id === f.id ? (
                <div className="space-y-2">
                  <Label htmlFor={`${id}-edit-${f.id}`}>Edit comment</Label>
                  <textarea id={`${id}-edit-${f.id}`} rows={3} maxLength={SESSION_FEEDBACK_LIMITS.maxBody} className={AREA} value={editing.body} onChange={(e) => setEditing({ id: f.id, body: e.target.value })} />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={pending} onClick={() => run(() => updateFeedback(clientId, logId, f.id, { body: editing.body }), () => setEditing(null))}>
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <p className="whitespace-pre-wrap text-ui">{f.body}</p>
                    {f.carryForward ? (
                      <Badge tone="signal" icon={CornerDownRight}>
                        Carries forward
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <label className="flex h-8 items-center gap-1.5 px-1 text-meta text-muted">
                      <input type="checkbox" className="size-4 rounded-sm" checked={f.carryForward} disabled={pending} onChange={(e) => run(() => updateFeedback(clientId, logId, f.id, { carryForward: e.target.checked }))} />
                      Carry
                    </label>
                    <Button variant="ghost" size="sm" aria-label="Edit comment" onClick={() => setEditing({ id: f.id, body: f.body })}>
                      <Icon icon={Pencil} />
                    </Button>
                    <Button variant="ghost" size="sm" aria-label="Delete comment" disabled={pending} onClick={() => run(() => removeFeedback(clientId, logId, f.id))}>
                      <Icon icon={Trash2} />
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {compact && !open ? (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          Comment
        </Button>
      ) : (
        <div className={clsx('space-y-2', compact && 'rounded-md border border-line p-2')}>
          <Label htmlFor={`${id}-new`}>{label}</Label>
          <textarea id={`${id}-new`} rows={compact ? 2 : 3} maxLength={SESSION_FEEDBACK_LIMITS.maxBody} className={AREA} value={body} placeholder="Write a comment" onChange={(e) => setBody(e.target.value)} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-ui">
              <input type="checkbox" className="size-4 rounded-sm" checked={carry} onChange={(e) => setCarry(e.target.checked)} />
              {carryLabel}
            </label>
            <div className="flex gap-2">
              {compact ? (
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              ) : null}
              <Button size="sm" onClick={submit} disabled={pending || !body.trim()}>
                {pending ? 'Saving…' : 'Add comment'}
              </Button>
            </div>
          </div>
        </div>
      )}
      <FormError>{error}</FormError>
    </div>
  );
}
