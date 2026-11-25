'use client';

import clsx from 'clsx';
import { useTransition } from 'react';
import { IMPORT_SOURCES } from '@coaching/shared';
import type { ImportJobDto } from '@coaching/shared';
import { rollbackImport } from '@/actions/data';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { TABLE, TD, TD_NUM, TH, TH_NUM, THEAD, TR } from '@/components/ui/table';
import { formatDate } from '@/lib/format';

function RollbackButton({ job }: { job: ImportJobDto }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="danger"
      disabled={pending}
      aria-label={`Roll back ${IMPORT_SOURCES[job.source].label} import from ${formatDate(job.createdAt)}`}
      onClick={() => {
        const what = IMPORT_SOURCES[job.source].kind === 'WORKOUTS' ? 'sessions' : 'entries';
        if (!window.confirm(`Delete the ${job.createdCount} ${what} this import added, including any edits you made to them since?`)) return;
        start(async () => {
          const res = await rollbackImport(job.id);
          toast.show(res.ok ? { message: 'Import rolled back', tone: 'ok' } : { message: res.error, tone: 'error' });
        });
      }}
    >
      {pending ? 'Rolling back…' : 'Roll back'}
    </Button>
  );
}

export function ImportHistory({ jobs }: { jobs: ImportJobDto[] }) {
  return (
    <section aria-labelledby="history-heading" className="overflow-hidden rounded-md border border-line bg-card">
      <h2 id="history-heading" className="border-b border-line px-6 py-4 font-display text-title-md text-ink">
        Import history
      </h2>
      {jobs.length === 0 ? (
        <p className="px-6 py-5 text-ui text-muted">No imports yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className={TABLE}>
            <thead className={THEAD}>
              <tr>
                <th scope="col" className={TH}>DATE</th>
                <th scope="col" className={TH}>SOURCE</th>
                <th scope="col" className={TH}>FILE</th>
                <th scope="col" className={TH_NUM}>ADDED</th>
                <th scope="col" className={TH_NUM}>DUPLICATES</th>
                <th scope="col" className={TH_NUM}>SKIPPED</th>
                <th scope="col" className={TH}>STATUS</th>
                <th scope="col" className={TH}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className={clsx(TR, j.status === 'ROLLED_BACK' && 'opacity-60')}>
                  <td className={clsx(TD, 'font-mono')}>{formatDate(j.createdAt)}</td>
                  <td className={TD}>{IMPORT_SOURCES[j.source].label}</td>
                  <td className={clsx(TD, 'max-w-[16rem] truncate text-muted')}>{j.fileName ?? '—'}</td>
                  <td className={TD_NUM}>{j.createdCount}</td>
                  <td className={TD_NUM}>{j.duplicateCount}</td>
                  <td className={TD_NUM}>{j.skippedCount}</td>
                  <td className={TD}>{j.status === 'COMPLETED' ? <Badge tone="emerald">Imported</Badge> : <Badge tone="slate">Rolled back</Badge>}</td>
                  <td className={TD}>{j.status === 'COMPLETED' && j.createdCount > 0 ? <RollbackButton job={j} /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
