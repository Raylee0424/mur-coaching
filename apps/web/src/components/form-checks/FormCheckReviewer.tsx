'use client';

import { angleDegrees, formatClipTime, MEDIA_LIMITS, ShapeKind, validateShapes } from '@coaching/shared';
import type { AnnotationShape, FormCheckDto, ShapePoint, VideoAnnotationDto } from '@coaching/shared';
import clsx from 'clsx';
import { Mic, Send, Square, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, useTransition, type PointerEvent } from 'react';
import { addAnnotation, completeReviewAudio, removeAnnotation, reserveReviewAudio, submitFormReview } from '@/actions/videos';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { activeAnnotations, drawShapes } from '@/components/videos/videos-model';

const TOOLS: { kind: ShapeKind; label: string; hint: string }[] = [
  { kind: ShapeKind.ARROW, label: 'Arrow', hint: 'Drag from tail to head.' },
  { kind: ShapeKind.ANGLE, label: 'Angle', hint: 'Click three points: arm, joint, arm.' },
  { kind: ShapeKind.FREEHAND, label: 'Freehand', hint: 'Drag to draw.' },
];

const clamp = (n: number): number => Math.min(1, Math.max(0, n));

/** Pause on a frame, draw, save the drawing at that timestamp; record narration; send the review. */
export function FormCheckReviewer({ check, subtitle }: { check: FormCheckDto; subtitle?: string }) {
  const toast = useToast();
  const reviewId = check.reviewId;
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<ShapeKind>(ShapeKind.ARROW);
  const [draft, setDraft] = useState<AnnotationShape[]>([]);
  const [stroke, setStroke] = useState<ShapePoint[] | null>(null);
  const [annotations, setAnnotations] = useState<VideoAnnotationDto[]>(check.review.annotations);
  const [ms, setMs] = useState(0);
  const [note, setNote] = useState('');
  const [summary, setSummary] = useState(check.review.summary ?? '');
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [recordedMs, setRecordedMs] = useState(0);
  const [audioUrl, setAudioUrl] = useState(check.review.audioUrl);

  // Redraw saved shapes near the playhead, the draft, and the stroke in progress.
  useEffect(() => {
    const c = canvas.current;
    const v = video.current;
    if (!c || !v) return;
    c.width = v.clientWidth;
    c.height = v.clientHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    const label = (s: AnnotationShape) => (s.kind === 'ANGLE' && s.points.length === 3 ? `${angleDegrees(s.points[0]!, s.points[1]!, s.points[2]!, c.width, c.height)}°` : null);
    const live = stroke && stroke.length > 1 ? [{ kind: tool === ShapeKind.ANGLE ? ShapeKind.FREEHAND : tool, points: stroke }] : [];
    drawShapes(ctx, [...activeAnnotations(annotations, ms).flatMap((a) => a.shapes), ...draft, ...live], c.width, c.height, label);
  }, [annotations, draft, stroke, ms, tool]);

  useEffect(() => {
    if (!recorder) return;
    const began = Date.now();
    const t = window.setInterval(() => setRecordedMs(Date.now() - began), 250);
    return () => window.clearInterval(t);
  }, [recorder]);

  const point = (e: PointerEvent<HTMLCanvasElement>): ShapePoint => {
    const r = e.currentTarget.getBoundingClientRect();
    return [clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height)];
  };

  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    video.current?.pause();
    const p = point(e);
    if (tool === ShapeKind.ANGLE) {
      const next = [...(stroke ?? []), p];
      if (next.length === 3) {
        setDraft((d) => [...d, { kind: ShapeKind.ANGLE, points: next }]);
        setStroke(null);
      } else setStroke(next);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setStroke([p]);
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!stroke || tool === ShapeKind.ANGLE) return;
    const p = point(e);
    setStroke(tool === ShapeKind.ARROW ? [stroke[0]!, p] : stroke.length < MEDIA_LIMITS.maxPoints ? [...stroke, p] : stroke);
  };
  const up = () => {
    if (!stroke || tool === ShapeKind.ANGLE) return;
    if (stroke.length >= 2) setDraft((d) => [...d, { kind: tool, points: stroke }]);
    setStroke(null);
  };

  const saveFrame = () => {
    setError(undefined);
    const problem = validateShapes(draft);
    if (problem) return setError(problem);
    const timestampMs = Math.round(ms);
    start(async () => {
      const res = await addAnnotation(reviewId, { timestampMs, shapes: draft, note: note.trim() || null });
      if (!res.ok) return setError(res.error);
      setAnnotations((a) => [...a, res.data].sort((x, y) => x.timestampMs - y.timestampMs));
      setDraft([]);
      setNote('');
    });
  };

  const deleteAnnotation = (id: string) =>
    start(async () => {
      const res = await removeAnnotation(reviewId, id);
      if (!res.ok) return setError(res.error);
      setAnnotations((a) => a.filter((x) => x.id !== id));
    });

  const seek = (t: number) => {
    const v = video.current;
    if (!v) return;
    v.pause();
    v.currentTime = t / 1000;
  };

  async function startRecording(): Promise<void> {
    setError(undefined);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setError('Microphone access was refused. Allow it in the browser to narrate.');
    }
    const type = MEDIA_LIMITS.audioTypes.find((t) => MediaRecorder.isTypeSupported(t));
    if (!type) {
      stream.getTracks().forEach((t) => t.stop());
      return setError('This browser cannot record audio in a supported format.');
    }
    const rec = new MediaRecorder(stream, { mimeType: type });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      setRecorder(null);
      void upload(new Blob(chunks, { type }), type);
    };
    rec.start();
    setRecordedMs(0);
    setRecorder(rec);
    void video.current?.play().catch(() => undefined);
  }

  function upload(blob: Blob, contentType: string): void {
    if (blob.size > MEDIA_LIMITS.maxAudioBytes) return setError('That narration is too long. Keep it under about 20 minutes.');
    start(async () => {
      const reserved = await reserveReviewAudio(reviewId, { contentType, sizeBytes: blob.size });
      if (!reserved.ok) return setError(reserved.error);
      try {
        const res = await fetch(reserved.data.uploadUrl, { method: 'PUT', headers: reserved.data.uploadHeaders, body: blob });
        if (!res.ok) throw new Error(String(res.status));
      } catch {
        return setError('The narration upload failed. Record it again.');
      }
      const done = await completeReviewAudio(reviewId, reserved.data.id);
      if (!done.ok) return setError(done.error);
      setAudioUrl(URL.createObjectURL(blob));
      toast.show({ message: 'Narration saved', tone: 'ok' });
    });
  }

  const send = () => {
    setError(undefined);
    start(async () => {
      const res = await submitFormReview(reviewId, summary);
      if (!res.ok) return setError(res.error);
      toast.show({ message: `Review sent to ${check.clientName}`, tone: 'ok' });
    });
  };

  const hint = TOOLS.find((t) => t.kind === tool)?.hint;

  return (
    <div className="grid items-start gap-6 xl:grid-cols-9">
      {/* Center (6 cols): Video Player + Telestrator Frame-Drawing Tools */}
      <section className="flex flex-col gap-4 rounded-md border border-line bg-card p-5 xl:col-span-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-title-md text-ink">
                {check.clientName} — {check.video.exerciseName} Set {check.video.setNumber}
              </h2>
              {check.review.status === 'REVIEWED' ? <Badge tone="emerald">Reviewed</Badge> : <Badge tone="amber">Pending</Badge>}
            </div>
            <p className="mt-0.5 font-mono text-label-sm text-muted">
              {subtitle ? `${subtitle} · ` : ''}Timestamp {formatClipTime(ms)} · {hint}
            </p>
          </div>

          <div role="group" aria-label="Drawing tool" className="inline-flex gap-1 rounded-sm border border-line bg-canvas-low p-1">
            {TOOLS.map((t) => (
              <button
                key={t.kind}
                type="button"
                aria-pressed={tool === t.kind}
                onClick={() => {
                  setTool(t.kind);
                  setStroke(null);
                }}
                className={clsx(
                  'rounded-sm px-2.5 py-1 font-sans text-label-sm transition-colors',
                  tool === t.kind ? 'bg-primary text-primary-ink' : 'text-muted hover:text-ink',
                )}
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => (setDraft([]), setStroke(null))}
              disabled={!draft.length && !stroke}
              className="rounded-sm px-2.5 py-1 font-sans text-label-sm text-rose hover:bg-rose-bg disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-sm border border-line bg-canvas-low">
          <video
            ref={video}
            src={check.video.url}
            controls
            playsInline
            preload="metadata"
            onTimeUpdate={(e) => setMs(e.currentTarget.currentTime * 1000)}
            onSeeked={(e) => setMs(e.currentTarget.currentTime * 1000)}
            className="aspect-video w-full bg-black object-contain"
            aria-label={`${check.clientName} ${check.video.exerciseName} set ${check.video.setNumber}`}
          />
          <canvas
            ref={canvas}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            aria-label={`Drawing surface. ${hint}`}
            role="img"
            className="absolute inset-x-0 top-0 h-[calc(100%-3rem)] w-full cursor-crosshair touch-none"
          />
        </div>

        <div className="flex flex-wrap items-end gap-2.5">
          <div className="min-w-48 flex-1">
            <Label htmlFor={`note-${reviewId}`}>Frame note (optional)</Label>
            <Input id={`note-${reviewId}`} value={note} maxLength={MEDIA_LIMITS.maxNote} onChange={(e) => setNote(e.target.value)} placeholder="Knees cave at the bottom" />
          </div>
          <Button size="sm" onClick={saveFrame} disabled={pending || draft.length === 0}>
            Save drawing at {formatClipTime(ms)}
          </Button>
        </div>

        {annotations.length ? (
          <ol aria-label="Saved drawings" className="divide-y divide-line rounded-sm border border-line bg-canvas-low">
            {annotations.map((a) => (
              <li key={a.id} className="flex items-center gap-2 px-3.5 py-2">
                <button type="button" onClick={() => seek(a.timestampMs)} className="flex min-h-8 flex-1 items-center gap-3 text-left text-ui">
                  <span className="font-mono text-label-sm text-primary">{formatClipTime(a.timestampMs)}</span>
                  <span className="truncate text-ink">{a.note ?? `${a.shapes.length} drawing${a.shapes.length === 1 ? '' : 's'}`}</span>
                </button>
                <Button size="sm" variant="ghost" onClick={() => deleteAnnotation(a.id)} disabled={pending} aria-label={`Delete drawing at ${formatClipTime(a.timestampMs)}`}>
                  <Icon icon={Trash2} />
                </Button>
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      {/* Right (3 cols): Narrated Review Recorder + Written Cue Summary */}
      <aside className="flex flex-col gap-4 rounded-md border border-line bg-card p-5 xl:col-span-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-title-md text-ink">Narrated Review</h2>
          <span className="font-mono text-label-sm text-rose tabular-nums">
            {recorder ? formatClipTime(recordedMs).slice(0, 5) : '00:00'}
          </span>
        </div>

        <div className="flex flex-col items-center gap-3 rounded-sm border border-line bg-canvas-low p-4 text-center">
          <span className="inline-flex size-14 items-center justify-center rounded-full border border-primary/50 bg-primary-container text-primary">
            <Icon icon={Mic} size={20} />
          </span>
          <p role="status" className="font-sans text-label-sm text-muted">
            {recorder ? 'Recording. Clip plays while you talk.' : audioUrl ? 'Narration attached.' : 'Telestrator Voice Narration'}
          </p>
          {recorder ? (
            <Button size="sm" variant="danger" className="w-full" onClick={() => recorder.stop()}>
              <Icon icon={Square} />
              Stop Recording
            </Button>
          ) : (
            <Button size="sm" variant="danger" className="w-full" onClick={() => void startRecording()} disabled={pending}>
              <Icon icon={Mic} />
              {audioUrl ? 'Record Again' : 'Start Recording'}
            </Button>
          )}
          {audioUrl && !recorder ? <audio src={audioUrl} controls preload="metadata" className="w-full" /> : null}
        </div>

        <div>
          <Label htmlFor={`summary-${reviewId}`}>Written cue summary</Label>
          <textarea
            id={`summary-${reviewId}`}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={MEDIA_LIMITS.maxSummary}
            rows={4}
            placeholder="Bar path stays centered over midfoot. Keep chest tall out of the hole."
            className="block w-full rounded-sm border border-line bg-canvas-low px-3 py-2 text-label-md font-normal text-ink placeholder:text-muted transition-colors hover:border-line-strong focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <FormError>{error}</FormError>

        <Button size="lg" className="w-full" onClick={send} disabled={pending || Boolean(recorder)} aria-busy={pending}>
          <Icon icon={Send} />
          {check.review.status === 'REVIEWED' ? 'Update Review' : 'Send Review to Athlete'}
        </Button>
      </aside>
    </div>
  );
}
