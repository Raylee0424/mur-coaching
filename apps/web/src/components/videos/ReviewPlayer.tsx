'use client';

import { angleDegrees, formatClipTime } from '@coaching/shared';
import type { AnnotationShape, FormReviewDto } from '@coaching/shared';
import { useEffect, useRef, useState } from 'react';
import { activeAnnotations, drawShapes } from './videos-model';

/** The athlete's view of a finished review: clip with drawings at their timestamps, narration, written cue. */
export function ReviewPlayer({ url, review, label }: { url: string; review: FormReviewDto; label: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ms, setMs] = useState(0);

  useEffect(() => {
    const c = canvas.current;
    const v = video.current;
    if (!c || !v) return;
    c.width = v.clientWidth;
    c.height = v.clientHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    const shapes = activeAnnotations(review.annotations, ms).flatMap((a) => a.shapes);
    const deg = (s: AnnotationShape) => (s.kind === 'ANGLE' && s.points.length === 3 ? `${angleDegrees(s.points[0]!, s.points[1]!, s.points[2]!, c.width, c.height)}°` : null);
    drawShapes(ctx, shapes, c.width, c.height, deg);
  }, [ms, review.annotations]);

  const seek = (t: number) => {
    const v = video.current;
    if (!v) return;
    v.pause();
    v.currentTime = t / 1000;
    setMs(t);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="relative overflow-hidden rounded-sm border border-line bg-black lg:col-span-7">
        <video
          ref={video}
          src={url}
          controls
          playsInline
          preload="metadata"
          onTimeUpdate={(e) => setMs(e.currentTarget.currentTime * 1000)}
          onSeeked={(e) => setMs(e.currentTarget.currentTime * 1000)}
          className="aspect-video w-full object-contain"
          aria-label={label}
        />
        <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
      </div>

      <div className="flex flex-col gap-3 lg:col-span-5">
        {review.summary ? (
          <div className="rounded-sm border border-line bg-canvas-low p-3.5">
            <p className="font-mono text-label-sm uppercase text-primary">Coach Cue</p>
            <p className="mt-1 whitespace-pre-wrap text-ui text-ink">{review.summary}</p>
          </div>
        ) : null}

        {review.audioUrl ? (
          <div className="rounded-sm border border-line bg-canvas-low p-3.5">
            <p className="mb-1.5 font-mono text-label-sm uppercase text-muted">Narrated Review</p>
            <audio src={review.audioUrl} controls preload="metadata" className="w-full" />
          </div>
        ) : null}

        {review.annotations.length ? (
          <div className="rounded-sm border border-line bg-canvas-low p-3">
            <p className="mb-1.5 px-1 font-mono text-label-sm uppercase text-muted">Timestamped Telestrator Frames</p>
            <ol className="space-y-1" aria-label="Annotated frames">
              {review.annotations.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => seek(a.timestampMs)}
                    className="flex min-h-9 w-full items-center gap-3 rounded-sm px-2.5 text-left text-ui transition-colors hover:bg-raised"
                  >
                    <span className="font-mono text-label-sm text-primary">{formatClipTime(a.timestampMs)}</span>
                    <span className="truncate text-ink">{a.note ?? `${a.shapes.length} drawing${a.shapes.length === 1 ? '' : 's'}`}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </div>
  );
}
