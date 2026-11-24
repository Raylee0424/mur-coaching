import type { DecimalString } from './common';

export const PhotoPose = { FRONT: 'FRONT', SIDE: 'SIDE', BACK: 'BACK' } as const;
export type PhotoPose = (typeof PhotoPose)[keyof typeof PhotoPose];
export const PHOTO_POSE_LABELS: Record<PhotoPose, string> = { FRONT: 'Front', SIDE: 'Side', BACK: 'Back' };

export const BODY_LIMITS = {
  minKg: 20,
  maxKg: 400,
  /** Photos are re-encoded to JPEG in the browser before upload. */
  maxPhotoBytes: 10 * 1024 * 1024,
  photoContentType: 'image/jpeg',
  /** Days of history the body page reads. */
  historyDays: 90,
} as const;

export interface BodyweightPointDto {
  date: string;
  weightKg: DecimalString;
}

export interface BodyGoalDto {
  targetKg: DecimalString;
  targetDate: string | null;
}

export interface BodyTrendDto {
  entries: BodyweightPointDto[];
  goal: BodyGoalDto | null;
}

export interface LogBodyweightRequest {
  date: string;
  weightKg: DecimalString;
}

export interface SaveBodyGoalRequest {
  targetKg: DecimalString;
  targetDate?: string | null;
}

export interface ProgressPhotoDto {
  id: string;
  pose: PhotoPose;
  takenOn: string;
  sharedWithCoach: boolean;
  /** Short-lived signed image URL. */
  url: string;
}

export interface ClientPhotosDto {
  storageConfigured: boolean;
  photos: ProgressPhotoDto[];
}

export interface CreateProgressPhotoRequest {
  pose: PhotoPose;
  takenOn: string;
  sizeBytes: number;
  sharedWithCoach: boolean;
}

export interface CreateProgressPhotoResponse {
  id: string;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
}

export interface UpdateProgressPhotoRequest {
  sharedWithCoach: boolean;
}

/** Coach view: only photos the client shared, plus their bodyweight trend. */
export interface CoachProgressDto {
  clientName: string;
  photos: ProgressPhotoDto[];
  entries: BodyweightPointDto[];
}

// ─── Pure trend math ───

export interface BodyTrendSummary {
  latest: { date: string; kg: number } | null;
  /** Mean of entries in the 7 days ending today. */
  rollingAvg7: number | null;
  /** Extremes over the 10 days ending today. */
  high10: { date: string; kg: number } | null;
  low10: { date: string; kg: number } | null;
  /** latest − goal (positive: above target). */
  goalDelta: number | null;
  /** 7-day trailing mean at each logged date, for the trend line. */
  series: { date: string; kg: number; avg7: number }[];
}

const DAY_MS = 86_400_000;
const day = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** `entries` in any order; `today` as `YYYY-MM-DD`. Entries after today are ignored. */
export function summarizeBodyweight(entries: BodyweightPointDto[], goal: BodyGoalDto | null, today: string): BodyTrendSummary {
  const t = day(today);
  const points = entries
    .map((e) => ({ date: e.date, kg: Number(e.weightKg), at: day(e.date) }))
    .filter((p) => Number.isFinite(p.kg) && p.at <= t)
    .sort((a, b) => a.at - b.at);

  const series = points.map((p) => {
    const window = points.filter((q) => q.at <= p.at && q.at > p.at - 7 * DAY_MS);
    return { date: p.date, kg: p.kg, avg7: round2(window.reduce((s, q) => s + q.kg, 0) / window.length) };
  });

  const last7 = points.filter((p) => p.at > t - 7 * DAY_MS);
  const last10 = points.filter((p) => p.at > t - 10 * DAY_MS);
  const pick = (better: (a: number, b: number) => boolean) =>
    last10.reduce<(typeof last10)[number] | null>((best, p) => (best === null || better(p.kg, best.kg) ? p : best), null);
  const high = pick((a, b) => a > b);
  const low = pick((a, b) => a < b);
  const latest = points.at(-1) ?? null;

  return {
    latest: latest && { date: latest.date, kg: latest.kg },
    rollingAvg7: last7.length ? round2(last7.reduce((s, p) => s + p.kg, 0) / last7.length) : null,
    high10: high && { date: high.date, kg: high.kg },
    low10: low && { date: low.date, kg: low.kg },
    goalDelta: latest && goal ? round2(latest.kg - Number(goal.targetKg)) : null,
    series,
  };
}

/** Default compare pair for one pose: the earliest and the latest photo (null when fewer than two). */
export function defaultComparePair<T extends { pose: PhotoPose; takenOn: string }>(photos: T[], pose: PhotoPose): [T, T] | null {
  const list = photos.filter((p) => p.pose === pose).sort((a, b) => a.takenOn.localeCompare(b.takenOn));
  return list.length >= 2 ? [list[0] as T, list[list.length - 1] as T] : null;
}
