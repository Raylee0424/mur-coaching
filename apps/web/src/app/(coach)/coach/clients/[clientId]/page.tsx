import { notFound } from 'next/navigation';
import { Role } from '@coaching/shared';
import { ClientHeader } from '@/components/clients/ClientHeader';
import { ClientSettingsDrawer } from '@/components/clients/ClientSettingsDrawer';
import { EvaluateAllButton } from '@/components/progression/EvaluateAllButton';
import { RecommendationList } from '@/components/progression/RecommendationList';
import { WorkoutLogList } from '@/components/workout-logs/WorkoutLogList';
import { ApiError } from '@/lib/api/client';
import { clientsApi, exercisesApi, progressionApi, workoutLogsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

async function load(clientId: string) {
  try {
    return await Promise.all([
      clientsApi.get(clientId),
      progressionApi.latest(clientId),
      exercisesApi.list(),
      workoutLogsApi.listForClient(clientId, { limit: 10 }),
      clientsApi.settings(clientId),
    ]);
  } catch (err) {
    // The API answers 404 for unknown and cross-tenant ids alike.
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
}

export default async function ClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const user = await requireUser(Role.COACH);
  const { clientId } = await params;
  const [client, recommendations, exercises, logs, settings] = await load(clientId);
  const exerciseNames = new Map(exercises.map((e) => [e.id, e.name]));

  return (
    <>
      <ClientHeader client={client} actions={<ClientSettingsDrawer settings={settings} coachUnit={user.weightUnit} />} />
      <div className="grid gap-8 lg:grid-cols-3">
        <section aria-labelledby="recs-heading" className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="recs-heading" className="text-lg font-semibold">
              Progression recommendations
            </h2>
            <EvaluateAllButton clientId={client.id} />
          </div>
          <RecommendationList recommendations={recommendations} exerciseNames={exerciseNames} canDismiss unit={user.weightUnit} />
        </section>
        <section aria-labelledby="logs-heading" className="space-y-4">
          <h2 id="logs-heading" className="text-lg font-semibold">
            Recent sessions
          </h2>
          <WorkoutLogList logs={logs.items} unit={user.weightUnit} />
        </section>
      </div>
    </>
  );
}
