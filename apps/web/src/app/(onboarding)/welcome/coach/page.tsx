import { CoachClientStatus, Role } from '@coaching/shared';
import { CoachOnboarding } from '@/components/onboarding/CoachOnboarding';
import type { PreviewTarget } from '@/components/engine/PreviewLine';
import { clientsApi, engineRulesApi, exercisesApi, progressionApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

/** A client lift with a recommendation (so it has history) for the live engine preview, if any. */
async function firstPreviewTarget(names: Map<string, string>): Promise<PreviewTarget | null> {
  const roster = (await clientsApi.list()).filter((c) => c.status === CoachClientStatus.ACTIVE);
  for (const client of roster) {
    const rec = (await progressionApi.latest(client.id))[0];
    if (rec) return { clientId: client.id, clientName: client.name, exerciseId: rec.exerciseId, exerciseName: names.get(rec.exerciseId) ?? 'a lift' };
  }
  return null;
}

export default async function CoachWelcomePage() {
  const user = await requireUser(Role.COACH);
  const [rules, library] = await Promise.all([engineRulesApi.get(), exercisesApi.list()]);
  const previewTarget = await firstPreviewTarget(new Map(library.map((e) => [e.id, e.name])));
  return <CoachOnboarding user={user} rules={rules} library={library} previewTarget={previewTarget} replay={user.onboardedAt !== null} />;
}
