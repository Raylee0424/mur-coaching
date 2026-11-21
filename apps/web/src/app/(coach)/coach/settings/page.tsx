import { CoachClientStatus, Role } from '@coaching/shared';
import { EngineRulesEditor } from '@/components/engine/EngineRulesEditor';
import type { PreviewTarget } from '@/components/engine/PreviewLine';
import { PageHeader } from '@/components/ui/PageHeader';
import { clientsApi, engineRulesApi, exercisesApi, progressionApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

export default async function SettingsPage() {
  const user = await requireUser(Role.COACH);
  const [rules, roster, exercises] = await Promise.all([engineRulesApi.get(), clientsApi.list(), exercisesApi.list()]);
  const names = new Map(exercises.map((e) => [e.id, e.name]));
  const active = roster.filter((c) => c.status === CoachClientStatus.ACTIVE);
  const latest = await Promise.all(active.map((c) => progressionApi.latest(c.id)));

  // Lifts that already have a recommendation are guaranteed to have enough history to preview.
  const previewTargets: PreviewTarget[] = active.flatMap((client, i) =>
    (latest[i] ?? []).map((rec) => ({
      clientId: client.id,
      clientName: client.name,
      exerciseId: rec.exerciseId,
      exerciseName: names.get(rec.exerciseId) ?? 'Unknown exercise',
    })),
  );

  return (
    <>
      <PageHeader
        title="Engine rules"
        subtitle="Your defaults for every client. Per-client overrides live in each client's settings."
      />
      <EngineRulesEditor initial={rules} previewTargets={previewTargets} unit={user.weightUnit} />
    </>
  );
}
