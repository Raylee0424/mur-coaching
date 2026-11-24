import clsx from 'clsx';
import Link from 'next/link';
import { Role } from '@coaching/shared';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { RESOURCE_FILTERS, filterResources, parseFilter } from '@/components/resources/resources-model';
import { UploadResourceSheet } from '@/components/resources/UploadResourceSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { resourcesApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { firstParam } from '@/lib/form';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ResourcesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser(Role.COACH);
  const [library, params] = await Promise.all([resourcesApi.library(), searchParams]);
  const filter = parseFilter(firstParam(params.filter));
  const shown = filterResources(library.resources, filter);
  const count = (key: (typeof RESOURCE_FILTERS)[number]['key']): number => filterResources(library.resources, key).length;

  return (
    <>
      <PageHeader
        title="Resource vault"
        meta={`${library.resources.length} files`}
        actions={<UploadResourceSheet disabledReason={library.storageConfigured ? null : 'File storage is not configured on this server.'} />}
      />
      <div className="space-y-6">
        <p className="text-ui text-muted">Store training guides, videos and meet-day sheets, then share them with the clients who need them.</p>
        {!library.storageConfigured ? (
          <p role="status" className="border-l-2 border-amber bg-card px-4 py-3 text-ui text-amber">
            File storage is not configured on this server, so uploads and downloads are off. Set the R2 variables in the API environment.
          </p>
        ) : null}
        <nav aria-label="Resource types" className="flex h-10 gap-1 border-b border-line">
          {RESOURCE_FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === 'all' ? '/coach/resources' : `/coach/resources?filter=${f.key}`}
              aria-current={f.key === filter ? 'page' : undefined}
              className={clsx(
                'inline-flex items-center gap-1.5 px-3 text-ui transition-colors focus-visible:-outline-offset-2',
                f.key === filter ? 'text-ink shadow-[inset_0_-2px_0_theme(colors.ink)]' : 'text-muted hover:text-ink',
              )}
            >
              {f.label}
              <span className="font-mono text-micro text-faint">{count(f.key)}</span>
            </Link>
          ))}
        </nav>
        {shown.length === 0 ? (
          <EmptyState title={filter === 'all' ? 'No files yet' : 'Nothing in this tab'}>
            {filter === 'all' ? 'Upload a guide, video or sheet to start your library.' : 'Switch tabs or upload a matching file.'}
          </EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((r) => (
              <ResourceCard key={r.id} resource={r} clients={library.clients} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
