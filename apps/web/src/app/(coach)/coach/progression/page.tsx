import Link from 'next/link';
import { RecommendationAction, RecommendationStatus, Role } from '@coaching/shared';
import type { RecommendationDto } from '@coaching/shared';
import { ActionBadge } from '@/components/progression/ActionBadge';
import { RecommendationCard } from '@/components/progression/RecommendationCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { clientsApi, exercisesApi, progressionApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

const ORDER: RecommendationAction[] = [
  RecommendationAction.DELOAD,
  RecommendationAction.INCREASE_LOAD,
  RecommendationAction.INCREASE_REPS,
  RecommendationAction.HOLD,
];

/** Every pending recommendation across the roster, deloads first. */
export default async function ProgressionQueuePage() {
  await requireUser(Role.COACH);
  const [clients, exercises] = await Promise.all([clientsApi.list(), exercisesApi.list()]);
  const exerciseNames = new Map(exercises.map((e) => [e.id, e.name]));
  const perClient = await Promise.all(clients.map((c) => progressionApi.latest(c.id)));

  const items = clients.flatMap((client, i) =>
    (perClient[i] ?? [])
      .filter((r) => r.status === RecommendationStatus.PENDING)
      .map((rec) => ({ client, rec })),
  );
  items.sort(
    (a, b) =>
      ORDER.indexOf(a.rec.action) - ORDER.indexOf(b.rec.action) || b.rec.createdAt.localeCompare(a.rec.createdAt),
  );
  const count = (action: RecommendationAction) => items.filter((x) => x.rec.action === action).length;

  return (
    <>
      <PageHeader
        title="Progression queue"
        subtitle={`${items.length} pending ${items.length === 1 ? 'recommendation' : 'recommendations'} across ${clients.length} ${clients.length === 1 ? 'client' : 'clients'}`}
      />
      <div className="space-y-6">
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {ORDER.map((action: RecommendationAction) => (
            <li key={action} className="space-y-2 rounded-lg border border-line bg-card p-4">
              <ActionBadge action={action} />
              <p className="font-display text-3xl font-extrabold tabular">{count(action)}</p>
            </li>
          ))}
        </ul>

        {items.length === 0 ? (
          <EmptyState title="Queue is clear">
            Open a client and re-run the engine to generate new recommendations.
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {items.map(({ client, rec }: { client: { id: string; name: string }; rec: RecommendationDto }) => (
              <div key={rec.id} className="space-y-2">
                <Link
                  href={`/coach/clients/${client.id}`}
                  className="text-xs font-semibold uppercase tracking-wider text-muted hover:text-primary"
                >
                  {client.name} →
                </Link>
                <RecommendationCard
                  recommendation={rec}
                  exerciseName={exerciseNames.get(rec.exerciseId) ?? 'Unknown exercise'}
                  canDismiss
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
