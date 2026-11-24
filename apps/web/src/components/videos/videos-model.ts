import { MEDIA_LIMITS, VideoSide } from '@coaching/shared';
import type { AnnotationShape, SetVideoDto, VideoAnnotationDto } from '@coaching/shared';

/** One frame step at 30 fps. Browsers expose no frame index, so stepping is by time. */
export const FRAME_SECONDS = 1 / 30;
/** An annotation shows on the frame within this distance of its timestamp. */
export const ANNOTATION_WINDOW_MS = 400;

export const VIDEO_ACCEPT = MEDIA_LIMITS.videoTypes.join(',');

/** Error message for an unusable source file, else null. */
export function videoFileProblem(file: { type: string; size: number }): string | null {
  if (!(MEDIA_LIMITS.videoTypes as readonly string[]).includes(file.type)) return 'Pick an MP4, MOV or WebM video.';
  if (file.size > MEDIA_LIMITS.maxVideoBytes) return 'Videos must be 200 MB or smaller. Trim the clip and try again.';
  return null;
}

/** Default L/R pair: the newest LEFT and RIGHT clips of the same exercise, else the two newest clips. */
export function defaultPair(videos: readonly SetVideoDto[]): [string | null, string | null] {
  for (const left of videos.filter((v) => v.side === VideoSide.LEFT)) {
    const right = videos.find((v) => v.side === VideoSide.RIGHT && v.exerciseName === left.exerciseName);
    if (right) return [left.id, right.id];
  }
  return [videos[0]?.id ?? null, videos[1]?.id ?? null];
}

/** Next time after stepping `frames`, clamped to the clip. */
export function stepTime(current: number, frames: number, duration: number): number {
  const next = current + frames * FRAME_SECONDS;
  return Math.min(Math.max(0, next), Number.isFinite(duration) ? duration : next);
}

export function activeAnnotations(annotations: readonly VideoAnnotationDto[], currentMs: number): VideoAnnotationDto[] {
  return annotations.filter((a) => Math.abs(a.timestampMs - currentMs) <= ANNOTATION_WINDOW_MS);
}

/** Draws shapes scaled to the canvas (ApexMetric: electric lime `#C6FF00` for arrows/freehand, sky `#38BDF8` for angle callouts). */
export function drawShapes(ctx: CanvasRenderingContext2D, shapes: readonly AnnotationShape[], width: number, height: number, label: (s: AnnotationShape) => string | null): void {
  ctx.lineWidth = Math.max(2.5, width / 260);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.font = `600 ${Math.max(13, Math.round(width / 38))}px ui-monospace, monospace`;
  for (const s of shapes) {
    const color = s.kind === 'ANGLE' ? '#38BDF8' : '#C6FF00';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    const pts = s.points.map(([x, y]) => [x * width, y * height] as const);
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
    if (s.kind === 'ARROW' && pts.length === 2) {
      const [[x0, y0], [x1, y1]] = pts as [readonly [number, number], readonly [number, number]];
      const angle = Math.atan2(y1 - y0, x1 - x0);
      const head = ctx.lineWidth * 5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - head * Math.cos(angle - Math.PI / 6), y1 - head * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x1 - head * Math.cos(angle + Math.PI / 6), y1 - head * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    }
    const text = label(s);
    if (text && pts[1]) ctx.fillText(text, pts[1][0] + 8, pts[1][1] - 8);
  }
}
