import type { DecimalString, IsoDateString } from './common';

export const VideoSide = { LEFT: 'LEFT', RIGHT: 'RIGHT', BOTH: 'BOTH' } as const;
export type VideoSide = (typeof VideoSide)[keyof typeof VideoSide];
export const VIDEO_SIDE_LABELS: Record<VideoSide, string> = { LEFT: 'Left', RIGHT: 'Right', BOTH: 'Both sides' };

export const FormReviewStatus = { PENDING: 'PENDING', REVIEWED: 'REVIEWED' } as const;
export type FormReviewStatus = (typeof FormReviewStatus)[keyof typeof FormReviewStatus];

export const MEDIA_LIMITS = {
  maxVideoBytes: 200 * 1024 * 1024,
  maxAudioBytes: 20 * 1024 * 1024,
  videoTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
  audioTypes: ['audio/webm', 'audio/mp4', 'audio/ogg'],
  /** Sets from this many days back can take a clip. */
  recentSetDays: 30,
  maxAnnotations: 40,
  maxShapes: 12,
  maxPoints: 200,
  maxSummary: 2000,
  maxNote: 300,
} as const;

export const ShapeKind = { ARROW: 'ARROW', ANGLE: 'ANGLE', FREEHAND: 'FREEHAND' } as const;
export type ShapeKind = (typeof ShapeKind)[keyof typeof ShapeKind];

/** x and y in 0–1 of the frame width and height. */
export type ShapePoint = [number, number];

/** ARROW: tail then head. ANGLE: arm, vertex, arm. FREEHAND: 2+ points. */
export interface AnnotationShape {
  kind: ShapeKind;
  points: ShapePoint[];
}

export interface VideoAnnotationDto {
  id: string;
  timestampMs: number;
  shapes: AnnotationShape[];
  note: string | null;
}

export interface FormReviewDto {
  id: string;
  status: FormReviewStatus;
  summary: string | null;
  requestedAt: IsoDateString;
  reviewedAt: IsoDateString | null;
  audioUrl: string | null;
  annotations: VideoAnnotationDto[];
}

export interface SetVideoDto {
  id: string;
  setLogId: string;
  side: VideoSide;
  exerciseName: string;
  performedAt: IsoDateString;
  setNumber: number;
  reps: number;
  weightKg: DecimalString;
  rpe: DecimalString | null;
  rir: number | null;
  contentType: string;
  url: string;
  createdAt: IsoDateString;
  /** Null until the client sends the clip for a form check. */
  review: FormReviewDto | null;
}

export interface VideoableSetDto {
  setLogId: string;
  exerciseName: string;
  performedAt: IsoDateString;
  setNumber: number;
  reps: number;
  weightKg: DecimalString;
  /** Sides that already have a clip. */
  taken: VideoSide[];
}

export interface ClientVideosDto {
  storageConfigured: boolean;
  hasCoach: boolean;
  videos: SetVideoDto[];
  recentSets: VideoableSetDto[];
}

export interface CreateSetVideoRequest {
  setLogId: string;
  side: VideoSide;
  contentType: string;
  sizeBytes: number;
}

/** Step 1 of every direct-to-R2 upload: PUT the file to `uploadUrl` with exactly `uploadHeaders`, then confirm. */
export interface UploadTicketDto {
  id: string;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
}

export interface FormCheckDto {
  reviewId: string;
  clientId: string;
  clientName: string;
  video: Omit<SetVideoDto, 'review'>;
  review: FormReviewDto;
}

export interface FormCheckQueueDto {
  storageConfigured: boolean;
  pending: FormCheckDto[];
  reviewed: FormCheckDto[];
  /** Mean hours from request to review over the reviewed list; null with none. */
  avgTurnaroundHours: number | null;
}

export interface CreateAnnotationRequest {
  timestampMs: number;
  shapes: AnnotationShape[];
  note?: string | null;
}

export interface CreateReviewAudioRequest {
  contentType: string;
  sizeBytes: number;
}

export interface SubmitFormReviewRequest {
  summary: string;
}

const inUnit = (n: unknown): boolean => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;

/** Shape list check shared by the reviewer UI and the API. Returns an error message or null. */
export function validateShapes(shapes: unknown): string | null {
  if (!Array.isArray(shapes) || shapes.length === 0) return 'Draw at least one shape.';
  if (shapes.length > MEDIA_LIMITS.maxShapes) return `Use at most ${MEDIA_LIMITS.maxShapes} shapes per frame.`;
  for (const s of shapes as AnnotationShape[]) {
    if (!s || !Object.values(ShapeKind).includes(s.kind) || !Array.isArray(s.points)) return 'A shape is malformed.';
    const n = s.points.length;
    if (s.kind === ShapeKind.ARROW && n !== 2) return 'An arrow needs two points.';
    if (s.kind === ShapeKind.ANGLE && n !== 3) return 'An angle needs three points.';
    if (s.kind === ShapeKind.FREEHAND && (n < 2 || n > MEDIA_LIMITS.maxPoints)) return `A stroke needs 2 to ${MEDIA_LIMITS.maxPoints} points.`;
    if (!s.points.every((p) => Array.isArray(p) && p.length === 2 && inUnit(p[0]) && inUnit(p[1]))) return 'Shape points must sit inside the frame.';
  }
  return null;
}

/** Angle at `vertex` in whole degrees (0–180), measured in pixels so a non-square frame stays true. */
export function angleDegrees(a: ShapePoint, vertex: ShapePoint, b: ShapePoint, width = 1, height = 1): number {
  const ax = (a[0] - vertex[0]) * width;
  const ay = (a[1] - vertex[1]) * height;
  const bx = (b[0] - vertex[0]) * width;
  const by = (b[1] - vertex[1]) * height;
  const lengths = Math.hypot(ax, ay) * Math.hypot(bx, by);
  if (lengths === 0) return 0;
  const cos = Math.min(1, Math.max(-1, (ax * bx + ay * by) / lengths));
  return Math.round((Math.acos(cos) * 180) / Math.PI);
}

/** `mm:ss.t` for a millisecond offset. */
export function formatClipTime(ms: number): string {
  const tenths = Math.floor(Math.max(0, ms) / 100);
  const m = Math.floor(tenths / 600);
  const s = Math.floor((tenths % 600) / 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${tenths % 10}`;
}
