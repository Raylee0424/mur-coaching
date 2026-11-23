import { Role } from '@coaching/shared';
import { ExerciseFilters, hasExerciseFilters, parseExerciseFilters } from '@/components/exercises/ExerciseFilters';
import { ExerciseLibrary } from '@/components/exercises/ExerciseLibrary';
import { PageHeader } from '@/components/ui/PageHeader';
import { exercisesApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ExercisesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser(Role.COACH);
  const { q, ...facets } = parseExerciseFilters(await searchParams);
  const filters = { ...(q ? { q } : {}), ...facets };
  const exercises = await exercisesApi.list(filters);

  return (
    <>
      <PageHeader title="Exercise library" meta="Increments, RPE caps and rep ranges per movement" />
      <ExerciseLibrary
        exercises={exercises}
        viewer="coach"
        userId={user.id}
        filtered={hasExerciseFilters(filters)}
        filters={<ExerciseFilters filters={filters} basePath="/coach/exercises" />}
      />
    </>
  );
}
