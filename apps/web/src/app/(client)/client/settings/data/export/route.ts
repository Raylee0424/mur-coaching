import { EXPORT_DATASETS, Role } from '@coaching/shared';
import { apiDownload } from '@/lib/api/client';
import { requireUser } from '@/lib/auth';

/**
 * Same-origin download for the full data export. The browser never calls the API: this handler adds the session's
 * bearer token server-side and streams the file back. Only known query values are forwarded.
 */
export async function GET(request: Request): Promise<Response> {
  await requireUser(Role.CLIENT);
  const params = new URL(request.url).searchParams;
  const format = params.get('format') === 'csv' ? 'csv' : 'json';
  const dataset = (EXPORT_DATASETS as readonly string[]).includes(params.get('dataset') ?? '') ? params.get('dataset')! : 'workouts';
  const query = format === 'csv' ? { format, dataset } : { format, ...(params.get('includeCycle') === 'true' ? { includeCycle: 'true' } : {}) };
  const res = await apiDownload('/me/data/export', query);
  if (!res.ok) return new Response('Export failed. Go back and try again.', { status: res.status === 401 ? 401 : 502, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  return new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'application/octet-stream',
      'Content-Disposition': res.headers.get('Content-Disposition') ?? 'attachment',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
