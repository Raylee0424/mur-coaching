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
  { key: 'library', label: 'Library and custom exercises' },
  { key: 'limits', label: 'Injuries and limitations' },
] as const;

/** Athlete exercise library (shared component with the coach view) and limitations manager. */
export default async function ClientExercisesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser(Role.CLIENT);
  const params = await searchParams;
  const tab = firstParam(params.tab) === 'limits' ? 'limits' : 'library';
  const day = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="Exercises and limits" />
      <nav aria-label="Exercises sections" className="mb-6 flex gap-0.5 rounded border border-line bg-canvas-low p-0.5 sm:inline-flex">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === 'library' ? '/client/exercises' : '/client/exercises?tab=limits'}
            aria-current={tab === t.key ? 'page' : undefined}
            className={clsx(
              'flex min-h-11 flex-1 items-center justify-center rounded-sm px-4 text-center text-ui sm:flex-none',
              tab === t.key ? 'bg-raised font-medium text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <LimitationsPanel clientId={userId} limitations={limitations} exercises={exercises.map((e) => ({ id: e.id, name: e.name }))} today={day} large />
      <aside className="h-fit rounded-md border border-line bg-card p-4">
        <p className="font-mono text-micro uppercase text-signal">Coach sync</p>
        <h2 className="mt-1 font-display text-ui font-semibold">{today.coachName ? `Shared with ${today.coachName}` : 'No coach linked'}</h2>
        <p className="mt-2 text-meta text-muted">
          {today.coachName
            ? 'Your coach sees every limitation. Avoid and Caution flags show on their client view and warn them when a program conflicts.'
            : 'Flags still mark exercises in your library, Today and the logger, and sort safer swaps first.'}
        </p>
      </aside>
    </div>
  );
}
