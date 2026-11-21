import Link from 'next/link';
import { Role } from '@coaching/shared';
import { TodayWorkoutPlaceholder } from '@/components/placeholders/TodayWorkoutPlaceholder';
import { RecommendationList } from '@/components/progression/RecommendationList';
import { PageHeader } from '@/components/ui/PageHeader';
import { WorkoutLogList } from '@/components/workout-logs/WorkoutLogList';
import { exercisesApi, progressionApi, workoutLogsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

export default async function ClientHome() {
  const user = await requireUser(Role.CLIENT);
  const [recommendations, exercises, logs] = await Promise.all([
    progressionApi.latest(user.id),
    exercisesApi.list(),
    workoutLogsApi.listForClient(user.id, { limit: 3 }),
  ]);
  const exerciseNames = new Map(exercises.map((e) => [e.id, e.name]));

  return (
    <div className="space-y-8">
      <PageHeader title={`Hi, ${user.name}`} subtitle={user.coachId ? 'Coached' : 'No active coach'} />
      <TodayWorkoutPlaceholder />

      <section aria-labelledby="targets-heading" className="space-y-4">
        <h2 id="targets-heading" className="text-lg font-semibold">
          Your next targets
        </h2>
        <RecommendationList recommendations={recommendations} exerciseNames={exerciseNames} canDismiss={false}
          unit={user.weightUnit}
          liftHref={(id) => `/client/lifts/${id}`}
        />
      </section>

      <section aria-labelledby="recent-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="recent-heading" className="text-lg font-semibold">
            Recent sessions
          </h2>
          <Link href="/client/history" className="text-sm font-semibold text-primary-soft underline">
            All history
          </Link>
        </div>
        <WorkoutLogList logs={logs.items} unit={user.weightUnit} />
      </section>
    </div>
  );
}
