import Link from 'next/link';
import { Role } from '@coaching/shared';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { programsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';

export default async function ProgramsPage() {
  await requireUser(Role.COACH);
  const programs = await programsApi.list();
  const newButton = (
    <Link href="/coach/programs/new" className={buttonClass('primary')}>
      New program
    </Link>
  );

  return (
    <>
      <PageHeader title="Programs" subtitle="Templates you build once and assign to clients." actions={newButton} />
      {programs.length === 0 ? (
        <EmptyState title="No templates yet">
          Build your first program: weeks, training days and prescriptions.{' '}
          <Link href="/coach/programs/new" className="font-semibold text-primary-soft underline">
            Create one
          </Link>
          .
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {programs.map((p) => (
            <li key={p.id}>
              <Link href={`/coach/programs/${p.id}`} className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                <Card className="h-full space-y-2 transition-colors hover:border-line-strong">
                  <h2 className="font-display text-lg font-bold">{p.name}</h2>
                  {p.description ? <p className="line-clamp-2 text-sm text-muted">{p.description}</p> : null}
                  <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                    <div>
                      <dt className="sr-only">Length</dt>
                      <dd>{p.durationWeeks} weeks</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Days per week</dt>
                      <dd>{p.daysPerWeek} days / week</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Active clients</dt>
                      <dd>
                        {p.activeAssignments} active {p.activeAssignments === 1 ? 'client' : 'clients'}
                      </dd>
                    </div>
                  </dl>
                  <p className="text-xs text-muted">Updated {formatDate(p.updatedAt)}</p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
