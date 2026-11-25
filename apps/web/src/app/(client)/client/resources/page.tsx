import { FileText } from 'lucide-react';
import { RESOURCE_KIND_LABELS, Role } from '@coaching/shared';
import { openSharedResource } from '@/actions/resources';
import { StripeActionButton } from '@/components/billing/StripeActionButton';
import { formatBytes } from '@/components/resources/resources-model';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { resourcesApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';

export default async function ClientResourcesPage() {
  await requireUser(Role.CLIENT);
  const resources = await resourcesApi.mine();
  return (
    <>
      <PageHeader title="Resources" back={{ href: '/client/profile', label: 'Profile' }} meta={`${resources.length} shared`} />
      <div>
        {resources.length === 0 ? (
          <EmptyState title="Nothing shared yet">Guides, videos and sheets your coach shares with you show up here.</EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {resources.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-card px-4 py-3">
                <FileText aria-hidden="true" className="size-5 shrink-0 text-faint" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-ui font-medium">{r.title}</p>
                  <p className="text-meta text-muted">
                    {r.description ? `${r.description} · ` : ''}
                    {formatBytes(r.sizeBytes)} · shared {formatDate(r.sharedAt)}
                  </p>
                </div>
                <Badge>{RESOURCE_KIND_LABELS[r.kind]}</Badge>
                {/* One-button form: the action signs a short-lived R2 link and redirects to it. */}
                <StripeActionButton action={openSharedResource} fields={{ resourceId: r.id }} label="Open" pendingLabel="Opening…" variant="secondary" size="sm" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
