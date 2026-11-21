import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RecommendationStatus, Role } from '@coaching/shared';
import { LineChart } from '@/components/charts/LineChart';
import { MetricsTable } from '@/components/progression/MetricsTable';
import { RecommendationCard } from '@/components/progression/RecommendationCard';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { ApiError } from '@/lib/api/client';
import { progressionApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { formatWeight, kgToDisplay, unitLabel } from '@/lib/units';

export default async function LiftDetailPage({ params }: { params: Promise<{ exerciseId: string }> }) {
  const { exerciseId } = await params;
  const user = await requireUser(Role.CLIENT);
  const history = await progressionApi.history(user.id, exerciseId).catch((err: unknown) => {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  });

  const { exercise, series, recommendations } = history;
  const best = series.reduce((m, s) => Math.max(m, s.e1rmKg), 0);
  const top = series.reduce((m, s) => Math.max(m, s.topWeightKg), 0);
  const pending = recommendations.find((r) => r.status === RecommendationStatus.PENDING);

  return (
    <div className="space-y-6">
      <Link href="/client" className="text-sm font-semibold text-muted hover:text-primary">
        ← Today
      </Link>
      <PageHeader title={exercise.name} subtitle="Lift detail: estimated 1RM trend and analysed sessions" />

      {series.length === 0 ? (
        <EmptyState title="No sessions yet">Log a prescribed session to see this lift&apos;s trend.</EmptyState>
      ) : (
        <>
          <ul className="grid grid-cols-3 gap-3">
            {[
              ['Best e1RM', formatWeight(best, user.weightUnit)],
              ['Top weight', formatWeight(top, user.weightUnit)],
              ['Sessions', String(series.length)],
            ].map(([label, value]) => (
              <li key={label} className="rounded-lg border border-line bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
                <p className="mt-1 font-display text-2xl font-extrabold tabular md:text-3xl">{value}</p>
              </li>
            ))}
          </ul>

          <Card className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Estimated 1RM ({unitLabel(user.weightUnit)})</h2>
            <LineChart
              title={`Estimated 1RM over time for ${exercise.name}`}
              unit={unitLabel(user.weightUnit)}
              points={series.map((s) => ({ label: formatDate(s.performedAt), value: kgToDisplay(s.e1rmKg, user.weightUnit) }))}
            />
          </Card>

          <Card className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Sessions</h2>
            <MetricsTable metrics={series} unit={user.weightUnit} />
          </Card>
        </>
      )}

      {pending ? (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold">Next target</h2>
          <RecommendationCard recommendation={pending} exerciseName={exercise.name} canDismiss={false} unit={user.weightUnit} />
        </section>
      ) : null}
    </div>
  );
}
