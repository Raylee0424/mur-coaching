import { Role, summarizeBodyweight } from '@coaching/shared';
import { DeleteEntryButton, GoalForm, LogWeightButton } from '@/components/body/BodyweightForms';
import { PhotoCompare } from '@/components/body/PhotoCompare';
import { PhotoGrid } from '@/components/body/PhotoGrid';
import { PhotoUpload } from '@/components/body/PhotoUpload';
import { LineChart } from '@/components/charts/LineChart';
import { Panel } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatStrip, type StatItem } from '@/components/ui/StatStrip';
import { bodyApi, meApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { formatWeight, kgToDisplay, unitLabel } from '@/lib/units';

const day = (iso: string): string => formatDate(`${iso}T00:00:00Z`);

export default async function BodyPage() {
  const user = await requireUser(Role.CLIENT);
  const unit = user.weightUnit;
  const [trend, photos, today] = await Promise.all([bodyApi.trend(), bodyApi.photos(), meApi.today()]);
  const todayIso = new Date().toISOString().slice(0, 10);
  const s = summarizeBodyweight(trend.entries, trend.goal, todayIso);
  const w = (kg: number): string => formatWeight(kg, unit);

  const stats: StatItem[] = [
    { label: '7-day average', value: s.rollingAvg7 === null ? '—' : String(kgToDisplay(s.rollingAvg7, unit)), unit: unitLabel(unit) },
    { label: '10D high', value: s.high10 ? String(kgToDisplay(s.high10.kg, unit)) : '—', unit: unitLabel(unit), note: s.high10 ? day(s.high10.date) : undefined },
    { label: '10D low', value: s.low10 ? String(kgToDisplay(s.low10.kg, unit)) : '—', unit: unitLabel(unit), note: s.low10 ? day(s.low10.date) : undefined },
    {
      label: 'Goal delta',
      value: s.goalDelta === null ? '—' : `${s.goalDelta > 0 ? '+' : ''}${kgToDisplay(s.goalDelta, unit)}`,
      unit: s.goalDelta === null ? undefined : unitLabel(unit),
      note: trend.goal ? `Target ${w(Number(trend.goal.targetKg))}` : 'No goal set',
    },
  ];

  return (
    <>
      <PageHeader
        title="Bodyweight"
        back={{ href: '/client/profile', label: 'Profile' }}
        meta={trend.goal ? `Goal ${w(Number(trend.goal.targetKg))}` : undefined}
        actions={<LogWeightButton today={todayIso} unit={unit} />}
      />
      <div className="max-w-4xl space-y-8">
        <StatStrip items={stats} label="Bodyweight summary" />

        {s.series.length === 0 ? (
          <EmptyState title="No weigh-ins yet">Log your morning weight a few times a week. The trend smooths out daily swings.</EmptyState>
        ) : (
          <Panel title="Trend" meta={`last ${trend.entries.length} entries · 7-day average`}>
            <div className="p-4">
              <LineChart title={`7-day average bodyweight in ${unitLabel(unit)}`} unit={unitLabel(unit)} points={s.series.map((p) => ({ label: day(p.date), value: kgToDisplay(p.avg7, unit) }))} />
              <details className="mt-3">
                <summary className="cursor-pointer text-ui text-primary">Show entries</summary>
                <table className="mt-2 w-full text-ui">
                  <thead>
                    <tr className="text-left font-mono text-micro uppercase text-muted">
                      <th className="py-2 font-normal">Date</th>
                      <th className="py-2 font-normal">Weight</th>
                      <th className="py-2 font-normal">7-day avg</th>
                      <th className="py-2 font-normal">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {[...s.series].reverse().map((p) => (
                      <tr key={p.date}>
                        <td className="py-1.5">{day(p.date)}</td>
                        <td className="py-1.5 font-mono">{w(p.kg)}</td>
                        <td className="py-1.5 font-mono text-muted">{w(p.avg7)}</td>
                        <td className="py-1.5 text-right">
                          <DeleteEntryButton date={p.date} label={day(p.date)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </div>
          </Panel>
        )}

        <Panel title="Goal">
          <div className="p-4">
            <GoalForm goal={trend.goal} unit={unit} />
          </div>
        </Panel>

        <section aria-labelledby="photos-heading" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="photos-heading" className="font-display text-title font-semibold">
                Progress photos
              </h2>
              <p className="text-meta text-muted">
                Private by default. {today.coachName ? `${today.coachName} sees only the photos you share.` : 'Only you can see them.'}
              </p>
            </div>
            <PhotoUpload today={todayIso} coachName={today.coachName} disabledReason={photos.storageConfigured ? null : 'Photo storage is not configured on this server.'} />
          </div>
          {!photos.storageConfigured ? (
            <p role="status" className="border-l-2 border-amber bg-card px-4 py-3 text-ui text-amber">
              Photo storage is not configured on this server, so photos are off.
            </p>
          ) : photos.photos.length === 0 ? (
            <EmptyState title="No photos yet">Take front, side and back photos in the same light every few weeks.</EmptyState>
          ) : (
            <>
              <Panel title="Compare">
                <div className="p-4">
                  <PhotoCompare photos={photos.photos} />
                </div>
              </Panel>
              <PhotoGrid photos={photos.photos} coachName={today.coachName} />
            </>
          )}
        </section>
      </div>
    </>
  );
}
