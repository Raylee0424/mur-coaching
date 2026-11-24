'use client';

import { VIDEO_SIDE_LABELS, VideoSide } from '@coaching/shared';
import type { VideoableSetDto } from '@coaching/shared';
import { Upload } from 'lucide-react';
import { useState, useTransition } from 'react';
import { completeSetVideo, reserveSetVideo } from '@/actions/videos';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/format';
import { VIDEO_ACCEPT, videoFileProblem } from './videos-model';

/** Reserve, PUT straight to R2, then the API checks size and file signature before listing the clip. */
export function VideoUpload({ sets, disabledReason, weight }: { sets: VideoableSetDto[]; disabledReason: string | null; weight: (kg: string) => string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function submit(form: FormData): void {
    setError(undefined);
    const file = form.get('video');
    if (!(file instanceof File) || file.size === 0) return setError('Choose or record a clip.');
    const problem = videoFileProblem(file);
    if (problem) return setError(problem);
    const setLogId = String(form.get('set') ?? '');
    if (!setLogId) return setError('Pick the set this clip shows.');
    const side = String(form.get('side')) as VideoSide;
    start(async () => {
      const reserved = await reserveSetVideo({ setLogId, side, contentType: file.type, sizeBytes: file.size });
      if (!reserved.ok) return setError(reserved.error);
      try {
        const res = await fetch(reserved.data.uploadUrl, { method: 'PUT', headers: reserved.data.uploadHeaders, body: file });
        if (!res.ok) throw new Error(String(res.status));
      } catch {
        return setError('The upload to storage failed. Check your connection and try again.');
      }
      const done = await completeSetVideo(reserved.data.id);
      if (!done.ok) return setError(done.error);
      toast.show({ message: 'Clip saved', tone: 'ok' });
      setOpen(false);
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} disabled={disabledReason !== null} title={disabledReason ?? undefined}>
        <Icon icon={Upload} />
        Upload set clip
      </Button>
      <Sheet
        open={open}
        onClose={pending ? () => undefined : () => setOpen(false)}
        title="Upload set clip"
        description="Clips are private to you until you send one for a form check. Video files keep their original metadata, which can include location."
        form={{ action: submit }}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {pending ? 'Uploading…' : 'Upload'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="sv-set">Logged set</Label>
            <Select id="sv-set" name="set" required defaultValue="">
              <option value="" disabled>
                {sets.length ? 'Pick a set' : 'No sets logged in the last 30 days'}
              </option>
              {sets.map((s) => (
                <option key={s.setLogId} value={s.setLogId}>
                  {formatDate(s.performedAt)} · {s.exerciseName} · set {s.setNumber} · {weight(s.weightKg)} × {s.reps}
                  {s.taken.length ? ` (has ${s.taken.map((t) => VIDEO_SIDE_LABELS[t].toLowerCase()).join(', ')})` : ''}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="sv-side">Side shown</Label>
            <Select id="sv-side" name="side" defaultValue={VideoSide.BOTH}>
              {Object.values(VideoSide).map((s) => (
                <option key={s} value={s}>
                  {VIDEO_SIDE_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="sv-file">Clip (MP4, MOV or WebM, up to 200 MB)</Label>
            <Input id="sv-file" name="video" type="file" accept={VIDEO_ACCEPT} capture="environment" required className="h-auto py-2" />
          </div>
          <FormError>{error}</FormError>
        </div>
      </Sheet>
    </>
  );
}
