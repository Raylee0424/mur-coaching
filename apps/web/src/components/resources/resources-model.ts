import { RESOURCE_CONTENT_TYPES, RESOURCE_LIMITS, ResourceKind } from '@coaching/shared';
import type { ResourceDto } from '@coaching/shared';

export type ResourceFilter = 'all' | 'guides' | 'videos' | 'sheets';

export const RESOURCE_FILTERS: readonly { key: ResourceFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'guides', label: 'Guides' },
  { key: 'videos', label: 'Videos' },
  { key: 'sheets', label: 'Sheets' },
];

const FILTER_KIND: Record<Exclude<ResourceFilter, 'all'>, ResourceKind> = {
  guides: ResourceKind.GUIDE,
  videos: ResourceKind.VIDEO,
  sheets: ResourceKind.SHEET,
};

export function parseFilter(value: string | undefined): ResourceFilter {
  return RESOURCE_FILTERS.some((f) => f.key === value) ? (value as ResourceFilter) : 'all';
}

export function filterResources<T extends Pick<ResourceDto, 'kind'>>(items: readonly T[], filter: ResourceFilter): T[] {
  return filter === 'all' ? [...items] : items.filter((r) => r.kind === FILTER_KIND[filter]);
}

/** "2.4 MB", "812 KB". Decimal units, as file managers show them. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(bytes >= 10_000_000 ? 0 : 1)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${bytes} B`;
}

/** The content type to send for a picked file. Browsers leave `type` empty for some CSV and Office files. */
export function contentTypeFor(file: { name: string; type: string }): string {
  if (file.type) return file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase();
  const byExt: Record<string, string> = {
    csv: 'text/csv',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    pdf: 'application/pdf',
  };
  return (ext && byExt[ext]) || '';
}

/** First problem with a picked file, or null. Mirrors the API so people learn before uploading. */
export function fileProblem(file: { name: string; type: string; size: number }): string | null {
  if (file.size === 0) return 'That file is empty.';
  if (file.size > RESOURCE_LIMITS.maxBytes) return `Files can be at most ${formatBytes(RESOURCE_LIMITS.maxBytes)}.`;
  if (!(contentTypeFor(file) in RESOURCE_CONTENT_TYPES)) return 'That file type is not supported. Use PDF, Word, text, CSV, Excel, MP4, MOV, WebM, PNG or JPEG.';
  return null;
}

/** "Shared with 3 clients" / "Not shared yet". */
export function shareLabel(count: number): string {
  if (count === 0) return 'Not shared yet';
  return `Shared with ${count} client${count === 1 ? '' : 's'}`;
}
