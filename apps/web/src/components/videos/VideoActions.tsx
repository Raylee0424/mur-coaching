'use client';

import { Send, Trash2 } from 'lucide-react';
import { useTransition } from 'react';
import { deleteSetVideo, requestFormCheck } from '@/actions/videos';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

export function VideoActions({ id, label, canRequest }: { id: string; label: string; canRequest: boolean }) {
  const toast = useToast();
  const [pending, start] = useTransition();

  const request = () =>
    start(async () => {
      const res = await requestFormCheck(id);
      toast.show(res.ok ? { message: 'Sent to your coach', tone: 'ok' } : { message: res.error, tone: 'error' });
    });
  const remove = () => {
    if (!window.confirm(`Delete the clip of ${label}? Any review on it is deleted too.`)) return;
    start(async () => {
      const res = await deleteSetVideo(id);
      toast.show(res.ok ? { message: 'Clip deleted', tone: 'ok' } : { message: res.error, tone: 'error' });
    });
  };

  return (
    <div className="flex items-center gap-1">
      {canRequest ? (
        <Button size="sm" variant="secondary" onClick={request} disabled={pending}>
          <Icon icon={Send} />
          Request form check
        </Button>
      ) : null}
      <Button size="sm" variant="ghost" onClick={remove} disabled={pending} aria-label={`Delete clip of ${label}`}>
        <Icon icon={Trash2} />
      </Button>
    </div>
  );
}
