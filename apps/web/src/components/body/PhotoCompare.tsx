'use client';

import { defaultComparePair, PHOTO_POSE_LABELS, PhotoPose } from '@coaching/shared';
import type { ProgressPhotoDto } from '@coaching/shared';
import clsx from 'clsx';
import { formatDate } from '@/lib/format';
import { useState } from 'react';
import { Label, Select } from '@/components/ui/Field';

const day = (iso: string): string => formatDate(`${iso}T00:00:00Z`);

/** Side-by-side compare for one pose; defaults to the earliest and latest photo. */
export function PhotoCompare({ photos, weightOn }: { photos: ProgressPhotoDto[]; weightOn?: Record<string, string> }) {
  const poses = Object.values(PhotoPose).filter((p) => photos.some((x) => x.pose === p));
  const [pose, setPose] = useState<PhotoPose>(poses[0] ?? PhotoPose.FRONT);
  const list = photos.filter((p) => p.pose === pose).sort((a, b) => a.takenOn.localeCompare(b.takenOn));
  const pair = defaultComparePair(photos, pose);
  const [picked, setPicked] = useState<Partial<Record<PhotoPose, [string, string]>>>({});
  const [leftId, rightId] = picked[pose] ?? (pair ? [pair[0].id, pair[1].id] : ['', '']);
  const left = list.find((p) => p.id === leftId);
  const right = list.find((p) => p.id === rightId);

  if (pair === null) return <p className="text-ui text-muted">Add at least two photos of the same pose to compare them.</p>;

  const side = (which: 0 | 1, photo: ProgressPhotoDto | undefined) => (
    <figure className="min-w-0 flex-1 space-y-2">
      <div>
        <Label htmlFor={`cmp-${which}`}>{which === 0 ? 'Before' : 'After'}</Label>
        <Select
          id={`cmp-${which}`}
          value={photo?.id ?? ''}
          onChange={(e) => setPicked((cur) => ({ ...cur, [pose]: which === 0 ? [e.target.value, rightId] : [leftId, e.target.value] }))}
        >
          {list.map((p) => (
            <option key={p.id} value={p.id}>
              {day(p.takenOn)}
            </option>
          ))}
        </Select>
      </div>
      {photo ? (
        // Signed R2 URL; next/image would need the bucket host in config and proxy private bytes.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.url} alt={`${PHOTO_POSE_LABELS[pose]} photo, ${day(photo.takenOn)}`} className="aspect-[3/4] w-full rounded-md border border-line bg-canvas-low object-cover" />
      ) : null}
      {photo ? (
        <figcaption className="font-mono text-meta text-muted">
          {day(photo.takenOn)}
          {weightOn?.[photo.takenOn] ? ` · ${weightOn[photo.takenOn]}` : ''}
        </figcaption>
      ) : null}
    </figure>
  );

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Pose" className="inline-flex h-9 items-center gap-0.5 rounded border border-line bg-canvas-low p-0.5">
        {poses.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={p === pose}
            onClick={() => setPose(p)}
            className={clsx('h-7 rounded-sm px-3 text-ui', p === pose ? 'bg-raised text-ink' : 'text-muted hover:text-ink')}
          >
            {PHOTO_POSE_LABELS[p]}
          </button>
        ))}
      </div>
      <div className="flex gap-3 sm:gap-4">
        {side(0, left)}
        {side(1, right)}
      </div>
    </div>
  );
}
