import clsx from 'clsx';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Role } from '@coaching/shared';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { TABLE, TD, TD_NUM, TH, TH_NUM, THEAD, TR } from '@/components/ui/table';
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
          <Link href="/coach/programs/new" className={buttonClass('primary', undefined, 'sm')}>
            <Icon icon={Plus} />
            New program
          </Link>
        }
      />
      <nav aria-label="Program lists" className="mb-6 flex h-10 gap-1 border-b border-line">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={t.key === tab ? 'page' : undefined}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 text-ui focus-visible:-outline-offset-2',
              t.key === tab ? 'text-ink shadow-[inset_0_-2px_0_theme(colors.ink)]' : 'text-muted hover:text-ink',
            )}
          >
            {t.label}
            <span className="font-mono text-micro text-faint">{t.count}</span>
          </Link>
        ))}
      </nav>
      {shown.length === 0 ? (
        tab === 'templates' ? (
          <EmptyState title="No templates yet" action={<Link href="/coach/programs/new" className={buttonClass('secondary', undefined, 'sm')}>Create a program</Link>}>
            Save a program as a template to reuse the weekly split for faster client onboarding.
          </EmptyState>
        ) : (
          <EmptyState title="No programs yet" action={<Link href="/coach/programs/new" className={buttonClass('secondary', undefined, 'sm')}>Create one</Link>}>
            Build your first program: weeks, training days and prescriptions.
          </EmptyState>
        )
      ) : (
        <div className="overflow-x-auto rounded-md border border-line bg-card">
          <table className={clsx(TABLE, 'min-w-[44rem]')}>
            <caption className="sr-only">{tab === 'templates' ? 'Templates' : 'Programs'}</caption>
            <thead className={THEAD}>
              <tr>
                <th scope="col" className={TH}>Name</th>
                <th scope="col" className={TH_NUM}>Weeks</th>
                <th scope="col" className={TH_NUM}>Days / week</th>
                <th scope="col" className={TH_NUM}>Clients</th>
                <th scope="col" className={TH}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id} className={TR}>
                  <td className={TD}>
                    <span className="flex items-center gap-2">
                      <Link href={`/coach/programs/${p.id}`} className="font-medium hover:underline">
                        {p.name}
                      </Link>
                      {p.isTemplate ? <Badge tone="neutral">Template</Badge> : null}
                    </span>
                    {p.description ? <span className="line-clamp-1 block text-meta text-faint">{p.description}</span> : null}
                  </td>
                  <td className={TD_NUM}>{p.durationWeeks}</td>
                  <td className={TD_NUM}>{p.daysPerWeek}</td>
                  <td className={clsx(TD_NUM, p.activeAssignments === 0 && 'text-faint')}>{p.activeAssignments}</td>
                  <td className={clsx(TD, 'font-mono text-muted')}>{formatDate(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
