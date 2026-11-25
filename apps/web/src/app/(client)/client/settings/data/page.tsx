import { Download, PlugZap } from 'lucide-react';
import Link from 'next/link';
import { IMPORT_SOURCES, Role } from '@coaching/shared';
import type { ImportSource } from '@coaching/shared';
import { ImportHistory } from '@/components/data/ImportHistory';
import { ImportWizard } from '@/components/data/ImportWizard';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { dataApi, exercisesApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';

const EXPORT = '/client/settings/data/export';

/** Data import/export (`athlete_web_data_import_export_ecosystem_sync`). Offline cache and watch controls wait for native. */
export default async function DataSettingsPage() {
  const user = await requireUser(Role.CLIENT);
  const [jobs, exercises] = await Promise.all([dataApi.jobs(), exercisesApi.list()]);
  const lastBySource: Partial<Record<ImportSource, string>> = {};
  for (const j of jobs) {
    if (j.status !== 'COMPLETED' || lastBySource[j.source]) continue;
    lastBySource[j.source] = IMPORT_SOURCES[j.source].kind === 'WORKOUTS' ? `Imported ${j.createdCount} logs` : `Synced ${formatDate(j.createdAt)}`;
  }

  return (
    <>
      <PageHeader
        title="Data Import/Export & Ecosystem Sync"
        back={{ href: '/client/profile', label: 'Back to profile' }}
        actions={
          <>
            <a href={`${EXPORT}?format=csv&dataset=workouts`} className={buttonClass('secondary', undefined, 'sm')} download>
              Export CSV
            </a>
            <a href={`${EXPORT}?format=json`} className={buttonClass('primary', undefined, 'sm')} download>
              Export Full JSON
            </a>
          </>
        }
      />
      <div className="space-y-8">
        <ImportWizard exercises={exercises.map((e) => ({ id: e.id, name: e.name }))} lastBySource={lastBySource} defaultUnit={user.weightUnit} />
        <ImportHistory jobs={jobs} />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <section aria-labelledby="export-heading" className="flex flex-col gap-4 rounded-md border border-line bg-card p-6 lg:col-span-7">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-mono text-label-sm uppercase text-primary">PORTABLE ARCHIVE</span>
                <h2 id="export-heading" className="mt-0.5 font-display text-title-lg text-ink">
                  Full Data Portability
                </h2>
              </div>
              <Badge tone="slate">Schema v1</Badge>
            </div>
            <p className="text-label-md text-muted">
              Download every workout, record, body metric, readiness survey, meal, water log and health day as JSON, or one flat CSV per area. Set videos and photos
              are listed, not bundled.
            </p>
            <form action={EXPORT} method="get" className="space-y-3">
              <input type="hidden" name="format" value="json" />
              <label className="flex items-start gap-2 text-label-md text-ink">
                <input type="checkbox" name="includeCycle" value="true" className="mt-0.5 accent-primary" />
                <span>
                  Include my private cycle log <span className="text-muted">(off by default; decrypted only into this file)</span>
                </span>
              </label>
              <button type="submit" className={buttonClass('primary', 'gap-2', 'sm')}>
                <Icon icon={Download} size={16} /> Download Archive (.JSON)
              </button>
            </form>
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              {(['workouts', 'nutrition', 'health'] as const).map((d) => (
                <a key={d} href={`${EXPORT}?format=csv&dataset=${d}`} className={buttonClass('ghost', undefined, 'sm')} download>
                  {`${d[0]!.toUpperCase()}${d.slice(1)} CSV`}
                </a>
              ))}
            </div>
          </section>

          <section aria-labelledby="ecosystem-heading" className="flex flex-col gap-4 rounded-md border border-line bg-card p-6 lg:col-span-5">
            <span className="font-mono text-label-sm uppercase text-primary">ECOSYSTEM SYNC</span>
            <h2 id="ecosystem-heading" className="-mt-3 font-display text-title-lg text-ink">
              Apps &amp; devices
            </h2>
            <ul className="space-y-3">
              <li className="flex items-center justify-between gap-3 rounded-sm border border-line bg-canvas-low p-3">
                <span className="text-ui text-ink">AI app connectors (read-only tokens)</span>
                <Link href="/client/settings/connectors" className={buttonClass('secondary', 'gap-1.5', 'sm')}>
                  <Icon icon={PlugZap} size={14} /> Manage
                </Link>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-sm border border-line bg-canvas-low p-3">
                <span className="text-ui text-ink">Apple Health &amp; daily CSV · steps, sleep, HRV</span>
                <Link href="/client/health" className={buttonClass('secondary', undefined, 'sm')}>
                  Open
                </Link>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-sm border border-line bg-canvas-low p-3">
                <span className="text-ui text-muted">Apple Watch, widgets &amp; offline cache</span>
                <Badge tone="slate">With mobile app</Badge>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
