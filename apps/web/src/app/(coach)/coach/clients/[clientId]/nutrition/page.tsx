import { notFound } from 'next/navigation';
import { NUTRITION_LIMITS, Role, summarizeAdherence } from '@coaching/shared';
import { ClientTabs } from '@/components/clients/ClientTabs';
import { AdherenceWeek, IntakeAudit, LoggedEntries } from '@/components/nutrition/CoachPanels';
import { targetBadge } from '@/components/nutrition/DayPanels';
import { ReleaseTargetButton, TargetForm } from '@/components/nutrition/DayControls';
import { DeletePlanButton, MealPlanEditor } from '@/components/nutrition/MealPlanEditor';
import { dayStamp, dayTotals, fmt, litres } from '@/components/nutrition/nutrition-model';
import { Badge } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatStrip } from '@/components/ui/StatStrip';
import { ApiError } from '@/lib/api/client';
import { nutritionApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

export default async function ClientNutritionPage({ params }: { params: Promise<{ clientId: string }> }) {
  await requireUser(Role.COACH);
  const { clientId } = await params;
  let data;
  try {
    data = await nutritionApi.forClient(clientId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const totals = dayTotals(data.todayEntries);
  const todayRow = data.days.at(-1);
  const summary = summarizeAdherence(data.days, data.target);
  const span = data.days.length;

  return (
    <>
      <PageHeader
        title={`${data.clientName}: nutrition oversight`}
        back={{ href: `/coach/clients/${clientId}`, label: 'Back to client' }}
        actions={data.todayEntries.length ? <Badge tone="emerald">Logged today</Badge> : <Badge tone="slate">No log today</Badge>}
      />
      <ClientTabs clientId={clientId} active="nutrition" />

      <div className="flex flex-col gap-6">
        <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <article className="flex flex-col gap-5 rounded-md border border-line bg-card p-6 lg:col-span-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="font-sans text-label-sm uppercase text-primary">Coach target editor</span>
                <h2 className="mt-0.5 font-display text-title-lg text-ink">Set calorie, macro &amp; water targets</h2>
              </div>
              {targetBadge(data.target)}
            </div>
            <TargetForm target={data.target} clientId={clientId} submitLabel="Save & sync targets" />
            {data.target ? (
              <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
                <p className="text-label-md text-muted">While you manage targets, the client cannot change them.</p>
                <ReleaseTargetButton clientId={clientId} />
              </div>
            ) : null}
          </article>

          <article className="flex flex-col gap-5 rounded-md border border-line bg-card p-6 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-sans text-label-sm uppercase text-emerald">Target vs. logged audit</span>
                <h2 className="mt-0.5 font-display text-title-lg text-ink">Today&apos;s intake ({dayStamp(data.today)})</h2>
              </div>
              <span className="font-mono text-label-md text-primary">
                {fmt(totals.kcal)}
                {data.target ? ` / ${fmt(data.target.kcal)}` : ''} kcal
              </span>
            </div>
            <IntakeAudit totals={totals} waterMl={todayRow?.waterMl ?? 0} target={data.target} />
            <div className="flex flex-col gap-2.5">
              <span className="font-sans text-label-sm uppercase text-muted">Client logged entries</span>
              <LoggedEntries entries={data.todayEntries} />
            </div>
          </article>
        </section>

        <StatStrip
          label={`${span}-day adherence`}
          items={[
            {
              label: 'On-target days',
              value: data.target ? `${summary.onTargetDays}/${span}` : '—',
              note: data.target ? '90–110% kcal, ≥90% protein' : 'Set targets to score days',
              emphasis: true,
            },
            { label: 'Days logged', value: `${summary.loggedDays}/${span}`, note: `Last ${span} days` },
            { label: 'Avg intake', value: summary.avgKcal === null ? '—' : fmt(summary.avgKcal), unit: 'kcal', note: summary.avgProteinG === null ? undefined : `${fmt(summary.avgProteinG)} g protein` },
            {
              label: 'Hydration',
              value: `${summary.hydratedDays}/${span}`,
              note: `Days at ${litres(summary.waterTargetMl)} L${data.target?.waterMl ? '' : ' (default)'}`,
            },
          ]}
        />

        <Panel title="Protein, calorie & hydration trend" meta={`Last ${span} days · newest first`}>
          <AdherenceWeek summary={summary} target={data.target} />
        </Panel>

        <Panel title="Assigned meal plans" meta={`${data.plans.length} of ${NUTRITION_LIMITS.maxPlansPerClient}`} actions={data.plans.length < NUTRITION_LIMITS.maxPlansPerClient ? <MealPlanEditor clientId={clientId} plan={null} /> : undefined}>
          {data.plans.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No meal plans yet">Build a one-day plan from the food catalog. The client logs meals in one tap and gets a weekly grocery list.</EmptyState>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {data.plans.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                  <div className="min-w-0">
                    <p className="font-display text-title-md text-ink">{p.name}</p>
                    <p className="font-mono text-label-sm text-muted">
                      {p.meals.length} {p.meals.length === 1 ? 'meal' : 'meals'} · {fmt(Number(p.totals.kcal))} kcal · {fmt(Number(p.totals.proteinG))}P / {fmt(Number(p.totals.carbsG))}C /{' '}
                      {fmt(Number(p.totals.fatG))}F
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <MealPlanEditor clientId={clientId} plan={p} />
                    <DeletePlanButton clientId={clientId} plan={p} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
