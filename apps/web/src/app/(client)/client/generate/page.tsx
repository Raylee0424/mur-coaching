import { Feature, Role } from '@coaching/shared';
import { WorkoutGenerator } from '@/components/ai/WorkoutGenerator';
import { UpgradeCard } from '@/components/ai/UpgradeCard';
import { statusOf, targetLabel } from '@/components/limitations/limitations-model';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { billingApi, exercisesApi, limitationsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

/** Injury-Aware AI Workout Generator (`athlete_web_injury_aware_ai_workout_generator_pro`). */
export default async function GeneratePage() {
  const user = await requireUser(Role.CLIENT);
  const [entitlements, limitations, catalog] = await Promise.all([billingApi.entitlements(), limitationsApi.list(user.id), exercisesApi.list()]);
  const today = new Date().toISOString().slice(0, 10);
  const guardrails = limitations
    .filter((l) => statusOf(l, today) === 'active')
    .map((l) => ({ id: l.id, severity: l.severity, label: `${targetLabel(l)}${l.note ? ` (${l.note})` : ''}` }));

  return (
    <>
      <PageHeader title="Injury-Aware AI Workout Generator" meta={<Badge tone="signal">PRO</Badge>} back={{ href: '/client', label: 'Back to today' }} />
      {entitlements.features.includes(Feature.AI_WORKOUT_GENERATOR) ? (
        <WorkoutGenerator guardrails={guardrails} catalog={catalog} unit={user.weightUnit} />
      ) : (
        <UpgradeCard title="The AI Workout Generator is a Pro feature" message="Generated sessions that respect your limitations and gym equipment are part of MUR Coaching Pro." />
      )}
    </>
  );
}
