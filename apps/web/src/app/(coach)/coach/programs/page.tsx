import clsx from 'clsx';
import Link from 'next/link';
import { Role } from '@coaching/shared';
import type { ProgramSummaryDto } from '@coaching/shared';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { programsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { firstParam } from '@/lib/form';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ProgramsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser(Role.COACH);
  const params = await searchParams;
  const tab = firstParam(params.tab) === 'templates' ? 'templates' : 'programs';
  const all = await programsApi.list();
  const templates = all.filter((p) => p.isTemplate);
  const programs = all.filter((p) => !p.isTemplate);
  const shown = tab === 'templates' ? templates : programs;

  const tabs = [
    { key: 'programs', label: 'Programs', count: programs.length, href: '/coach/programs' },
    { key: 'templates', label: 'Templates', count: templates.length, href: '/coach/programs?tab=templates' },
  ] as const;

  return (
    <>
      <PageHeader
        title="Programs"
        actions={
          <Link href="/coach/programs/new" className={buttonClass('primary')}>
            New program
          </Link>
        }
      />
      <nav aria-label="Program lists" className="mb-6 flex gap-1 border-b border-line">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={t.key === tab ? 'page' : undefined}
            className={clsx(
              '-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-semibold focus-visible:-outline-offset-2',
              t.key === tab ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {t.label}
            <span className="tabular-nums text-muted">({t.count})</span>
          </Link>
        ))}
      </nav>
      {shown.length === 0 ? (
        tab === 'templates' ? (
          <EmptyState title="No templates yet">
            Save a program as a template to reuse the weekly split for faster client onboarding.{' '}
            <Link href="/coach/programs/new" className="font-semibold text-primary-soft underline">
              Create a program
            </Link>
            .
          </EmptyState>
        ) : (
          <EmptyState title="No programs yet">
            Build your first program: weeks, training days and prescriptions.{' '}
            <Link href="/coach/programs/new" className="font-semibold text-primary-soft underline">
              Create one
            </Link>
            .
          </EmptyState>
        )
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {shown.map((p) => (
            <ProgramCard key={p.id} program={p} />
          ))}
        </ul>
      )}
    </>
  );
}

function ProgramCard({ program: p }: { program: ProgramSummaryDto }) {
  return (
    <li>
      <Link href={`/coach/programs/${p.id}`} className="block rounded-lg">
        <Card className="h-full space-y-2 transition-colors hover:border-line-strong">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-bold">{p.name}</h2>
            {p.isTemplate ? <Badge tone="neutral">Template</Badge> : null}
          </div>
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
  );
}
