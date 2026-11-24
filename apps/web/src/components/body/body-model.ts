import { BODY_LIMITS, PhotoPose } from '@coaching/shared';

/** Longest edge after re-encoding: plenty for a side-by-side compare, small enough for the 10 MB cap. */
export const PHOTO_MAX_EDGE = 2048;
export const PHOTO_QUALITY = 0.88;
/** Formats the browser can usually decode; HEIC works in Safari only. */
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif';
const SOURCE_MAX_BYTES = 40 * 1024 * 1024;

export function fitWithin(width: number, height: number, maxEdge = PHOTO_MAX_EDGE): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function sourcePhotoProblem(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith('image/')) return 'Choose a photo (JPEG, PNG, WebP or HEIC).';
  if (file.size > SOURCE_MAX_BYTES) return 'That photo is over 40 MB. Choose a smaller one.';
  return null;
}

export const encodedPhotoProblem = (size: number): string | null =>
  size > BODY_LIMITS.maxPhotoBytes ? 'The photo is still over 10 MB after compression. Try a smaller one.' : null;

export const parsePose = (v: string | undefined): PhotoPose => (v === 'SIDE' || v === 'BACK' ? v : PhotoPose.FRONT);
