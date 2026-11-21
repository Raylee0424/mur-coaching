import { Role } from '@coaching/shared';
import { WorkoutLogger } from '@/components/logger/WorkoutLogger';
import { PageHeader } from '@/components/ui/PageHeader';
import { exercisesApi, workoutLogsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

export default async function LogPage() {
  const user = await requireUser(Role.CLIENT);
  const [exercises, latest] = await Promise.all([
    exercisesApi.list(),
    workoutLogsApi.listForClient(user.id, { limit: 1 }),
  ]);

  return (
    <>
      <PageHeader title="Log session" subtitle="Weights are in kilograms." />
      <WorkoutLogger exercises={exercises} lastLog={latest.items[0] ?? null} />
    </>
  );
}
