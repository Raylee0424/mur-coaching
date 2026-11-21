import { Role } from '@coaching/shared';
import { ClientOnboarding } from '@/components/onboarding/ClientOnboarding';
import { pickBaselineLifts } from '@/components/onboarding/client-onboarding-model';
import { clientsApi, exercisesApi, meApi, programsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

export default async function ClientWelcomePage() {
  const user = await requireUser(Role.CLIENT);
  const [me, profile, library] = await Promise.all([meApi.profile(), clientsApi.get(user.id), exercisesApi.list()]);
  const programId = profile.activeAssignment?.programId;
  const program = programId ? await programsApi.get(programId).catch(() => null) : null;
  return (
    <ClientOnboarding
      me={me}
      unit={user.weightUnit}
      lifts={pickBaselineLifts(program, library)}
      hasCoach={user.coachId !== null}
      replay={user.onboardedAt !== null}
    />
  );
}
