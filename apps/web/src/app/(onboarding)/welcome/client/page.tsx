import { Role, type ProgramDto, type ExerciseDto } from '@coaching/shared';
import { ClientOnboarding, type FirstSessionItem } from '@/components/onboarding/ClientOnboarding';
import { pickBaselineLifts } from '@/components/onboarding/client-onboarding-model';
import { clientsApi, exercisesApi, meApi, programsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

function buildFirstSession(
  program: ProgramDto | null,
  library: ExerciseDto[],
  lifts: { exerciseId: string; name: string }[],
): { title: string; subtitle: string; items: FirstSessionItem[] } {
  const byId = new Map(library.map((e) => [e.id, e]));
  const firstDay = program?.workouts
    .filter((w) => w.weekNumber === 1)
    .sort((a, b) => a.dayNumber - b.dayNumber)[0];

  if (firstDay && firstDay.exercises.length > 0) {
    return {
      title: firstDay.name || 'Day 1 Workout',
      subtitle: `${program?.name ?? 'Program'} · Week 1 · Day ${firstDay.dayNumber}`,
      items: firstDay.exercises.slice(0, 5).map((rx) => ({
        name: rx.exercise.name,
        equipment: byId.get(rx.exerciseId)?.equipment ?? null,
        prescription: `${rx.targetSets} × ${
          rx.targetRepsMin === rx.targetRepsMax ? rx.targetRepsMin : `${rx.targetRepsMin}–${rx.targetRepsMax}`
        }${rx.targetRpe ? ` @ RPE ${rx.targetRpe}` : ''}`,
      })),
    };
  }

  return {
    title: 'Starter Strength A',
    subtitle: 'Block 1 · Week 1 · Baseline Calibration',
    items: lifts.slice(0, 4).map((l) => ({
      name: l.name,
      equipment: byId.get(l.exerciseId)?.equipment ?? null,
      prescription: '3 × 5 @ RPE 8',
    })),
  };
}

export default async function ClientWelcomePage() {
  const user = await requireUser(Role.CLIENT);
  const [me, profile, library] = await Promise.all([meApi.profile(), clientsApi.get(user.id), exercisesApi.list()]);
  const programId = profile.activeAssignment?.programId;
  const program = programId ? await programsApi.get(programId).catch(() => null) : null;
  const lifts = pickBaselineLifts(program, library);
  return (
    <ClientOnboarding
      me={me}
      unit={user.weightUnit}
      lifts={lifts}
      library={library.map((e) => ({ id: e.id, name: e.name, equipment: e.equipment }))}
      firstSession={buildFirstSession(program, library, lifts)}
      hasCoach={user.coachId !== null}
      replay={user.onboardedAt !== null}
    />
  );
}
