import { Role } from '@coaching/shared';
import { ExerciseFilters } from '@/components/exercises/ExerciseFilters';
import { ExerciseLibrary } from '@/components/exercises/ExerciseLibrary';
import { PageHeader } from '@/components/ui/PageHeader';
import { exercisesApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { firstParam, isMuscleGroup } from '@/lib/form';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ExercisesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser(Role.COACH);
  const params = await searchParams;

  const q = firstParam(params.q)?.trim() ?? '';
  const group = firstParam(params.muscleGroup);
  const muscleGroup = isMuscleGroup(group) ? group : undefined;

  const exercises = await exercisesApi.list({
    ...(q ? { q } : {}),
    ...(muscleGroup ? { muscleGroup } : {}),
  });

  return (
    <>
      <PageHeader title="Exercise library" meta={`${exercises.length} ${exercises.length === 1 ? 'exercise' : 'exercises'}`} />
      <ExerciseFilters q={q} muscleGroup={muscleGroup ?? ''} />
      <ExerciseLibrary exercises={exercises} coachId={user.id} filtered={Boolean(q || muscleGroup)} />
    </>
  );
}
