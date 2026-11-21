import { Role } from '@coaching/shared';
import { WorkoutLogger } from '@/components/logger/WorkoutLogger';
import { PageHeader } from '@/components/ui/PageHeader';
import { exercisesApi, meApi, workoutLogsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

export default async function LogPage() {
  const user = await requireUser(Role.CLIENT);
  const [exercises, latest, me] = await Promise.all([
    exercisesApi.list(),
    workoutLogsApi.listForClient(user.id, { limit: 1 }),
    meApi.profile(),
  ]);
  const baselines = Object.fromEntries(
    me.baselines.flatMap((b) => (b.weightKg === null ? [] : [[b.exerciseId, { weightKg: b.weightKg, reps: b.reps }]])),
  );

  return (
    <>
      <PageHeader
        title="Log session"
        subtitle={`Weights are in ${user.weightUnit === 'LB' ? 'pounds' : 'kilograms'}. Change units from your account menu.`}
      />
      <WorkoutLogger exercises={exercises} lastLog={latest.items[0] ?? null} unit={user.weightUnit} baselines={baselines} />
    </>
  );
}
