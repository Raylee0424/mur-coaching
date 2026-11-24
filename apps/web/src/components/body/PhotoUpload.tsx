'use client';

import { PHOTO_POSE_LABELS, PhotoPose } from '@coaching/shared';
import { Camera } from 'lucide-react';
import { useState, useTransition } from 'react';
import { completeProgressPhoto, reserveProgressPhoto } from '@/actions/body';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { encodedPhotoProblem, PHOTO_ACCEPT, sourcePhotoProblem } from './body-model';
import { stripToJpeg } from './strip-photo';

/** Re-encode in the browser (metadata gone), PUT straight to R2, then the API verifies size and header. */
export function PhotoUpload({ today, disabledReason, coachName }: { today: string; disabledReason: string | null; coachName: string | null }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function submit(form: FormData): void {
    setError(undefined);
    const file = form.get('photo');
    if (!(file instanceof File) || file.size === 0) return setError('Choose a photo.');
    const problem = sourcePhotoProblem(file);
    if (problem) return setError(problem);
    const pose = String(form.get('pose')) as PhotoPose;
    const takenOn = String(form.get('takenOn') ?? today);
    const sharedWithCoach = form.get('share') === 'on';
    start(async () => {
      let jpeg: Blob;
      try {
        jpeg = await stripToJpeg(file);
      } catch {
        return setError('This browser could not read that photo. Try a JPEG or PNG.');
      }
      const tooBig = encodedPhotoProblem(jpeg.size);
      if (tooBig) return setError(tooBig);
      const reserved = await reserveProgressPhoto({ pose, takenOn, sizeBytes: jpeg.size, sharedWithCoach });
      if (!reserved.ok) return setError(reserved.error);
      try {
        const res = await fetch(reserved.data.uploadUrl, { method: 'PUT', headers: reserved.data.uploadHeaders, body: jpeg });
        if (!res.ok) throw new Error(String(res.status));
      } catch {
        return setError('The upload to storage failed. Check your connection and try again.');
      }
      const done = await completeProgressPhoto(reserved.data.id);
      if (!done.ok) return setError(done.error);
      toast.show({ message: 'Photo saved', tone: 'ok' });
      setOpen(false);
    });
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)} disabled={disabledReason !== null} title={disabledReason ?? undefined}>
        <Icon icon={Camera} />
        Add photo
      </Button>
      <Sheet
        open={open}
        onClose={pending ? () => undefined : () => setOpen(false)}
        title="Add progress photo"
        description="Location and camera details are removed before upload. Photos stay private unless you share them."
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
            <Label htmlFor="ph-file">Photo</Label>
            <Input id="ph-file" name="photo" type="file" accept={PHOTO_ACCEPT} required className="h-auto py-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ph-pose">Pose</Label>
              <Select id="ph-pose" name="pose" defaultValue={PhotoPose.FRONT}>
                {Object.values(PhotoPose).map((p) => (
                  <option key={p} value={p}>
                    {PHOTO_POSE_LABELS[p]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="ph-date">Taken on</Label>
              <Input id="ph-date" name="takenOn" type="date" defaultValue={today} max={today} required />
            </div>
          </div>
          {coachName ? (
            <label className="flex min-h-11 items-center gap-2 text-ui">
              <input type="checkbox" name="share" className="size-4" />
              Share with {coachName}
            </label>
          ) : null}
          <FormError>{error}</FormError>
        </div>
      </Sheet>
    </>
  );
}
