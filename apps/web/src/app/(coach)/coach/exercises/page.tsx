import { Role } from '@coaching/shared';
import { ExerciseFilters } from '@/components/exercises/ExerciseFilters';
import { ExerciseForm } from '@/components/exercises/ExerciseForm';
import { ExerciseTable } from '@/components/exercises/ExerciseTable';
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

  const filters = new URLSearchParams();
  if (q) filters.set('q', q);
  if (muscleGroup) filters.set('muscleGroup', muscleGroup);
  const query = filters.toString();
  const baseHref = query ? `/coach/exercises?${query}` : '/coach/exercises';

  return (
    <>
      <PageHeader title="Exercise library" subtitle={`${exercises.length} ${exercises.length === 1 ? 'exercise' : 'exercises'}`} />
      <details className="mb-4 rounded-lg border border-line bg-card p-4">
        <summary className="cursor-pointer text-sm font-semibold">Add custom exercise</summary>
        <div className="mt-4">
          <ExerciseForm mode="create" />
        </div>
      </details>
      <ExerciseFilters q={q} muscleGroup={muscleGroup ?? ''} />
      <ExerciseTable
        exercises={exercises}
        coachId={user.id}
        editId={firstParam(params.edit)}
        baseHref={baseHref}
      />
    </>
  );
}
