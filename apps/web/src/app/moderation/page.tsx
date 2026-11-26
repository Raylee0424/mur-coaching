import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ModerationReportPage } from '@coaching/shared';
import { ReportCard } from '@/components/moderation/ReportCard';
import { TAB_STATUS, emptyText, openCountLabel, parseReportTab } from '@/components/moderation/moderation-model';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Segmented';
import { ApiError } from '@/lib/api/client';
import { moderationApi } from '@/lib/api/endpoints';
import { firstParam } from '@/lib/form';

export const metadata = { title: 'Reports · MUR Coaching' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ModerationPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const tab = parseReportTab(firstParam(params.status));
  const cursor = firstParam(params.cursor) || undefined;
  let page: ModerationReportPage;
  try {
    page = await moderationApi.reports({ status: TAB_STATUS[tab], cursor });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const base = tab === 'reviewed' ? '/moderation?status=reviewed' : '/moderation';
  const olderParams = new URLSearchParams();
  if (tab === 'reviewed') olderParams.set('status', 'reviewed');
  if (page.nextCursor) olderParams.set('cursor', page.nextCursor);

  return (
    <>
      <PageHeader title="Reports" meta={openCountLabel(page.counts.OPEN)} metaOnPhone />
      <p role="status" aria-live="polite" className="sr-only">
        {page.counts.OPEN} open reports, {page.counts.REVIEWED} reviewed
      </p>
      <div className="flex flex-col gap-4">
        <Segmented
          label="Report status"
          items={[
            { href: '/moderation', label: 'Open', count: page.counts.OPEN, current: tab === 'open' },
            { href: '/moderation?status=reviewed', label: 'Reviewed', count: page.counts.REVIEWED, current: tab === 'reviewed' },
          ]}
        />
        {page.items.length === 0 ? (
          <EmptyState title={emptyText(tab)} />
        ) : (
          <ul className="flex flex-col gap-3">
            {page.items.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          {cursor ? (
            <Link href={base} className={buttonClass('secondary', undefined, 'sm')}>
              Newest
            </Link>
          ) : null}
          {page.nextCursor ? (
            <Link href={`/moderation?${olderParams.toString()}`} className={buttonClass('secondary', undefined, 'sm')}>
              Older reports
            </Link>
          ) : null}
        </div>
      </div>
    </>
  );
}
