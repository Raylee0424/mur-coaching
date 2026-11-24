import type { IsoDateString } from './common';

export const ResourceKind = { GUIDE: 'GUIDE', VIDEO: 'VIDEO', SHEET: 'SHEET', OTHER: 'OTHER' } as const;
export type ResourceKind = (typeof ResourceKind)[keyof typeof ResourceKind];

export const RESOURCE_KIND_LABELS: Record<ResourceKind, string> = { GUIDE: 'Guide', VIDEO: 'Video', SHEET: 'Sheet', OTHER: 'File' };

export const RESOURCE_LIMITS = { maxBytes: 200 * 1024 * 1024, maxTitle: 120, maxDescription: 500, maxFileName: 200 } as const;

/** Accepted upload types and the library tab each one lands in. */
export const RESOURCE_CONTENT_TYPES: Record<string, ResourceKind> = {
  'application/pdf': ResourceKind.GUIDE,
  'application/msword': ResourceKind.GUIDE,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ResourceKind.GUIDE,
  'text/plain': ResourceKind.GUIDE,
  'video/mp4': ResourceKind.VIDEO,
  'video/quicktime': ResourceKind.VIDEO,
  'video/webm': ResourceKind.VIDEO,
  'application/vnd.ms-excel': ResourceKind.SHEET,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ResourceKind.SHEET,
  'text/csv': ResourceKind.SHEET,
  'image/png': ResourceKind.OTHER,
  'image/jpeg': ResourceKind.OTHER,
};

/** Null when the type is not allowed. */
export function resourceKindFor(contentType: string): ResourceKind | null {
  return RESOURCE_CONTENT_TYPES[contentType.toLowerCase()] ?? null;
}

export interface ResourceDto {
  id: string;
  title: string;
  description: string | null;
  kind: ResourceKind;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: IsoDateString;
  /** Client ids the file is shared with. */
  sharedWith: string[];
}

export interface ResourceLibraryDto {
  /** False when no R2 credentials are set: nothing can be uploaded or opened. */
  storageConfigured: boolean;
  resources: ResourceDto[];
  /** Clients the coach may share with. */
  clients: { id: string; name: string }[];
}

export interface CreateResourceRequest {
  title: string;
  description?: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

/** Step 1 of an upload: the browser PUTs the file to `uploadUrl` with exactly these headers, then confirms. */
export interface CreateResourceResponse {
  resource: ResourceDto;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
}

export interface ShareResourceRequest {
  /** The full set of clients that should see the file; others lose access. */
  clientIds: string[];
}

export interface ClientResourceDto {
  id: string;
  title: string;
  description: string | null;
  kind: ResourceKind;
  fileName: string;
  sizeBytes: number;
  sharedAt: IsoDateString;
}
