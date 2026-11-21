import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RecommendationStatus, Role } from '@coaching/shared';
import { ClientHeader } from '@/components/clients/ClientHeader';
import { ClientSettingsDrawer } from '@/components/clients/ClientSettingsDrawer';
import { ClientTabs } from '@/components/clients/ClientTabs';
import { LiftsTab } from '@/components/clients/LiftsTab';
import { NotesTab } from '@/components/clients/NotesTab';
import { OverviewTab } from '@/components/clients/OverviewTab';
import { currentMonth, isMonthKey, nextSession } from '@/components/clients/calendar-model';
import { parseTab } from '@/components/clients/overview-model';
import { buttonClass } from '@/components/ui/Button';
import { WorkoutLogList } from '@/components/workout-logs/WorkoutLogList';
import { ApiError } from '@/lib/api/client';
import { clientsApi, exercisesApi, progressionApi, workoutLogsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { firstParam } from '@/lib/form';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const HISTORY_PAGE = 10;

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: SearchParams;
}) {
  const user = await requireUser(Role.COACH);
  const { clientId } = await params;
  const query = await searchParams;
  const tab = parseTab(firstParam(query.tab));
  const monthParam = firstParam(query.month);
  const month = isMonthKey(monthParam) ? monthParam : currentMonth();
  const cursor = firstParam(query.cursor);

  try {
    const [client, overview, recommendations, settings, exercises] = await Promise.all([
      clientsApi.get(clientId),
      clientsApi.overview(clientId, month),
      progressionApi.latest(clientId),
      clientsApi.settings(clientId),
      tab === 'overview' || tab === 'lifts' ? exercisesApi.list() : Promise.resolve([]),
    ]);
    const exerciseNames = new Map(exercises.map((e) => [e.id, e.name]));
    const pending = recommendations.filter((r) => r.status === RecommendationStatus.PENDING);
    const logs = tab === 'history' ? await workoutLogsApi.listForClient(clientId, { limit: HISTORY_PAGE, ...(cursor ? { cursor } : {}) }) : null;

    return (
      <>
        <ClientHeader
          client={client}
          unit={user.weightUnit}
          stats={{ adherencePct: overview.adherence.value, weeklyVolumeKg: overview.weeklyVolumeKg.value, pending: pending.length }}
          actions={<ClientSettingsDrawer settings={settings} coachUnit={user.weightUnit} />}
        />
        <ClientTabs clientId={clientId} active={tab} />
        {tab === 'overview' ? (
          <OverviewTab
            clientId={clientId}
            overview={overview}
            pending={pending}
            exerciseNames={exerciseNames}
            unit={user.weightUnit}
            hasProgram={client.activeAssignment !== null}
          />
        ) : null}
        {tab === 'lifts' ? (
          <LiftsTab
            clientId={clientId}
            recommendations={recommendations}
            exerciseNames={exerciseNames}
            next={nextSession(overview.days)}
            programId={client.activeAssignment?.programId ?? null}
            unit={user.weightUnit}
          />
        ) : null}
        {tab === 'history' && logs ? (
          <section aria-labelledby="history-heading" className="space-y-4">
            <h2 id="history-heading" className="font-display text-lg font-bold">
              Session history
            </h2>
            <WorkoutLogList logs={logs.items} unit={user.weightUnit} />
            <div className="flex gap-2">
              {cursor ? (
                <Link href={`/coach/clients/${clientId}?tab=history`} className={buttonClass('secondary')}>
                  Back to latest
                </Link>
              ) : null}
              {logs.nextCursor ? (
                <Link href={`/coach/clients/${clientId}?tab=history&cursor=${encodeURIComponent(logs.nextCursor)}`} className={buttonClass('secondary')}>
                  Older sessions
                </Link>
              ) : null}
            </div>
          </section>
        ) : null}
        {tab === 'notes' ? <NotesTab clientId={clientId} initial={client.notes ?? ''} /> : null}
      </>
    );
  } catch (err) {
    // The API answers 404 for unknown and cross-tenant ids alike.
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
}
