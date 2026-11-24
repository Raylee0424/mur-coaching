'use client';

import { PHOTO_POSE_LABELS } from '@coaching/shared';
import type { ProgressPhotoDto } from '@coaching/shared';
import { Trash2 } from 'lucide-react';
import { useTransition } from 'react';
import { formatDate } from '@/lib/format';
import { deleteProgressPhoto, shareProgressPhoto } from '@/actions/body';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

const day = (iso: string): string => formatDate(`${iso}T00:00:00Z`);

/** Owner view: share toggle per photo and hard delete. */
export function PhotoGrid({ photos, coachName }: { photos: ProgressPhotoDto[]; coachName: string | null }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const run = (call: () => Promise<{ ok: true } | { ok: false; error: string }>, message: string): void =>
    start(async () => {
      const res = await call();
      toast.show(res.ok ? { message, tone: 'ok' } : { message: res.error, tone: 'error' });
    });

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {[...photos].reverse().map((p) => {
        const label = `${PHOTO_POSE_LABELS[p.pose]}, ${day(p.takenOn)}`;
        return (
          <li key={p.id} className="space-y-2 rounded-md border border-line bg-card p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={`${label} photo`} loading="lazy" className="aspect-[3/4] w-full rounded-sm bg-canvas-low object-cover" />
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-mono text-micro text-muted">{label}</span>
              {p.sharedWithCoach ? <Badge tone="sky">Shared</Badge> : <Badge>Private</Badge>}
            </div>
            <div className="flex items-center justify-between gap-1">
              {coachName || p.sharedWithCoach ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => shareProgressPhoto(p.id, !p.sharedWithCoach), p.sharedWithCoach ? 'Photo is private again' : 'Photo shared with your coach')}
                >
                  {p.sharedWithCoach ? 'Make private' : 'Share with coach'}
                </Button>
              ) : (
                <span />
              )}
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                aria-label={`Delete ${label} photo`}
                onClick={() => {
                  if (window.confirm('Delete this photo permanently? It cannot be recovered.')) run(() => deleteProgressPhoto(p.id), 'Photo deleted');
                }}
              >
                <Icon icon={Trash2} />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
