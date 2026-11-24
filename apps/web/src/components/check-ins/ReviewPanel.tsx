'use client';

import { CHECK_IN_LIMITS } from '@coaching/shared';
import { useState, useTransition } from 'react';
import { reviewCheckIn } from '@/actions/check-ins';
import { Button } from '@/components/ui/Button';
import { FormError, Label } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';

/** Reply and review state for one submitted check-in. Sending a reply also marks it reviewed. */
export function ReviewPanel({ id, reviewed, reply }: { id: string; reviewed: boolean; reply: string | null }) {
  const toast = useToast();
  const [text, setText] = useState(reply ?? '');
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const act = (nextReviewed: boolean, withReply: boolean): void =>
    start(async () => {
      setError(undefined);
      const res = await reviewCheckIn(id, nextReviewed, withReply ? text.trim() : undefined);
      if (!res.ok) return setError(res.error);
      toast.show({ message: withReply ? 'Reply sent' : nextReviewed ? 'Marked reviewed' : 'Marked unreviewed', tone: 'ok' });
    });

  return (
    <div className="space-y-3 border-t border-line pt-4">
      <Label htmlFor={`reply-${id}`}>Reply to client</Label>
      <textarea
        id={`reply-${id}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={CHECK_IN_LIMITS.maxReply}
        rows={3}
        placeholder="Great week. Keep protein where it is and add a rest day."
        className="block w-full rounded-sm border border-line bg-canvas-low px-3.5 py-2.5 text-ui text-ink placeholder:text-muted transition-colors hover:border-line-strong focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <FormError>{error}</FormError>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => act(true, true)} disabled={pending || !text.trim()} aria-busy={pending}>
          Send reply
        </Button>
        <Button size="sm" variant="secondary" onClick={() => act(!reviewed, false)} disabled={pending}>
          {reviewed ? 'Mark unreviewed' : 'Mark reviewed'}
        </Button>
      </div>
    </div>
  );
}
