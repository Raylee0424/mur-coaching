import clsx from 'clsx';
import Link from 'next/link';
import { Role } from '@coaching/shared';
import { ExerciseFilters, hasExerciseFilters, parseExerciseFilters } from '@/components/exercises/ExerciseFilters';
import { ExerciseLibrary } from '@/components/exercises/ExerciseLibrary';
import { LimitationsPanel } from '@/components/limitations/LimitationsPanel';
import { PageHeader } from '@/components/ui/PageHeader';
import { exercisesApi, limitationsApi, meApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { firstParam } from '@/lib/form';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TABS = [
  { key: 'library', label: 'Built-in + Custom Builder' },
  { key: 'limits', label: 'Injuries & Limitations Manager' },
] as const;

/** Athlete exercise library (shared component with the coach view) and limitations manager. */
export default async function ClientExercisesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser(Role.CLIENT);
  const params = await searchParams;
  const tab = firstParam(params.tab) === 'limits' ? 'limits' : 'library';
  const day = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title="Exercise Library & Limitations"
        actions={
          <nav aria-label="Exercises sections" className="inline-flex gap-1 rounded-sm border border-line bg-canvas-low p-1">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={t.key === 'library' ? '/client/exercises' : '/client/exercises?tab=limits'}
                aria-current={tab === t.key ? 'page' : undefined}
                className={clsx(
                  'rounded-sm px-4 py-1.5 font-sans text-label-md font-semibold transition-colors',
                  tab === t.key ? 'bg-primary text-primary-ink' : 'text-muted hover:text-ink',
                )}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        }
      />
      {tab === 'library' ? <LibraryTab userId={user.id} params={params} /> : <LimitsTab userId={user.id} day={day} />}
    </>
  );
}

async function LibraryTab({ userId, params }: { userId: string; params: Record<string, string | string[] | undefined> }) {
  const { q, ...facets } = parseExerciseFilters(params);
  const filters = { ...(q ? { q } : {}), ...facets };
  const exercises = await exercisesApi.list(filters);
  return (
    <ExerciseLibrary
      exercises={exercises}
      viewer="athlete"
      userId={userId}
      filtered={hasExerciseFilters(filters)}
      filters={<ExerciseFilters filters={filters} basePath="/client/exercises" />}
    />
  );
}

async function LimitsTab({ userId, day }: { userId: string; day: string }) {
  const [limitations, exercises, today] = await Promise.all([limitationsApi.list(userId), exercisesApi.list(), meApi.today()]);
  return (
    <div className="grid items-start gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <LimitationsPanel clientId={userId} limitations={limitations} exercises={exercises.map((e) => ({ id: e.id, name: e.name }))} today={day} large />
      </div>
      <aside className="flex flex-col gap-3 rounded-md border border-line bg-card p-6 lg:col-span-4">
        <span className="font-mono text-label-sm uppercase text-primary">COACH SYNC</span>
        <h2 className="font-display text-title-md text-ink">{today.coachName ? `Shared with ${today.coachName}` : 'No coach linked'}</h2>
        <p className="text-body-md text-muted">
          {today.coachName
            ? 'Any item marked Avoid (rose) or Caution (amber) appears immediately on your coach’s progression review screen and program builder.'
            : 'Flags mark exercises across your library, Today, and the active workout logger, and sort safer swaps first.'}
        </p>
      </aside>
    </div>
  );
}
