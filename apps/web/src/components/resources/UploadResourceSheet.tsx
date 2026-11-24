'use client';

import { Upload } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';
import { completeResource, reserveResource } from '@/actions/resources';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { contentTypeFor, fileProblem, formatBytes } from './resources-model';

/**
 * Three steps: the server reserves the row and signs a URL, the browser PUTs the file straight to R2 (the
 * API never carries file bytes), then the server confirms the object arrived at the declared size.
 */
export function UploadResourceSheet({ disabledReason }: { disabledReason: string | null }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const title = useRef<HTMLInputElement>(null);

  function close(): void {
    setOpen(false);
    setFile(null);
    setError(undefined);
  }

  function submit(form: FormData): void {
    if (!file) return setError('Choose a file.');
    const problem = fileProblem(file);
    if (problem) return setError(problem);
    setError(undefined);
    const contentType = contentTypeFor(file);
    const description = String(form.get('description') ?? '').trim();
    startTransition(async () => {
      const reserved = await reserveResource({
        title: String(form.get('title') ?? '').trim() || file.name,
        ...(description ? { description } : {}),
        fileName: file.name,
        contentType,
        sizeBytes: file.size,
      });
      if (!reserved.ok) return setError(reserved.error);
      const { resource, uploadUrl, uploadHeaders } = reserved.data;
      try {
        const res = await fetch(uploadUrl, { method: 'PUT', headers: uploadHeaders, body: file });
        if (!res.ok) throw new Error(`Storage answered ${res.status}`);
      } catch {
        return setError('The upload to storage failed. Check your connection and the bucket CORS settings, then try again.');
      }
      const done = await completeResource(resource.id);
      if (!done.ok) return setError(done.error);
      toast.show({ message: 'File added to your library', tone: 'ok' });
      close();
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} disabled={disabledReason !== null} title={disabledReason ?? undefined}>
        <Icon icon={Upload} />
        Upload file
      </Button>
      <Sheet
        open={open}
        onClose={pending ? () => undefined : close}
        title="Upload file"
        description="PDF, Word, text, CSV, Excel, MP4, MOV, WebM, PNG or JPEG, up to 200 MB."
        form={{ action: submit }}
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={pending}>
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
            <Label htmlFor="res-file">File</Label>
            <Input
              id="res-file"
              type="file"
              required
              onChange={(e) => {
                const picked = e.target.files?.[0] ?? null;
                setFile(picked);
                if (picked && title.current && !title.current.value) title.current.value = picked.name.replace(/\.[^.]+$/, '');
              }}
              className="h-auto py-2"
            />
            {file ? <p className="mt-1 font-mono text-meta text-muted">{formatBytes(file.size)}</p> : null}
          </div>
          <div>
            <Label htmlFor="res-title">Title</Label>
            <Input id="res-title" name="title" ref={title} required maxLength={120} />
          </div>
          <div>
            <Label htmlFor="res-desc">Description (optional)</Label>
            <Input id="res-desc" name="description" maxLength={500} />
          </div>
          <FormError>{error}</FormError>
        </div>
      </Sheet>
    </>
  );
}
