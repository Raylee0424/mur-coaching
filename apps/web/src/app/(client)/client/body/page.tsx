import clsx from 'clsx';
import { Role, summarizeBodyweight } from '@coaching/shared';
import { DeleteEntryButton, GoalForm, LogWeightButton } from '@/components/body/BodyweightForms';
import { PhotoCompare } from '@/components/body/PhotoCompare';
import { PhotoGrid } from '@/components/body/PhotoGrid';
import { PhotoUpload } from '@/components/body/PhotoUpload';
import { ReadinessCyclePanel } from '@/components/body/ReadinessCyclePanel';
import { LineChart } from '@/components/charts/LineChart';
import { Panel } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { TABLE, TD, TD_NUM, TH, TH_NUM, THEAD, TR } from '@/components/ui/table';
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

  return (
    <>
      <PageHeader
        title="Bodyweight, Readiness & Cycle Context"
        back={{ href: '/client/profile', label: 'Settings' }}
        meta={trend.goal ? `Goal: ${w(Number(trend.goal.targetKg))}` : undefined}
        actions={<LogWeightButton today={todayIso} unit={unit} />}
      />

      <div className="space-y-6">
        {/* Top: Bodyweight Telemetry, Rolling 7D Average & 10-Day High/Low Strip */}
        <section className="flex flex-col gap-5 rounded-md border border-line bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-mono text-label-sm uppercase text-primary">BODYWEIGHT TELEMETRY</span>
              <h2 className="mt-0.5 font-display text-title-md text-ink">
                7-Day Rolling Average:{' '}
                <span className="font-mono text-primary">
                  {s.rollingAvg7 === null ? '—' : `${kgToDisplay(s.rollingAvg7, unit)} ${unitLabel(unit)}`}
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-sm border border-line bg-canvas-low px-4 py-2">
                <span className="font-mono text-label-sm uppercase text-muted">10D HIGH</span>
                <p className="font-mono text-label-lg text-ink tabular-nums">
                  {s.high10 ? `${kgToDisplay(s.high10.kg, unit)} ${unitLabel(unit)}` : '—'}
                </p>
              </div>
              <div className="rounded-sm border border-line bg-canvas-low px-4 py-2">
                <span className="font-mono text-label-sm uppercase text-muted">10D LOW</span>
                <p className="font-mono text-label-lg text-emerald tabular-nums">
                  {s.low10 ? `${kgToDisplay(s.low10.kg, unit)} ${unitLabel(unit)}` : '—'}
                </p>
              </div>
              <div className="rounded-sm border border-line bg-canvas-low px-4 py-2">
                <span className="font-mono text-label-sm uppercase text-muted">GOAL DELTA</span>
                <p className={clsx('font-mono text-label-lg tabular-nums', s.goalDelta !== null ? 'text-sky' : 'text-muted')}>
                  {s.goalDelta === null ? 'No goal' : `${s.goalDelta > 0 ? '+' : ''}${kgToDisplay(s.goalDelta, unit)} ${unitLabel(unit)}`}
                </p>
              </div>
            </div>
          </div>

          {s.series.length === 0 ? (
            <EmptyState title="No weigh-ins yet">Log your morning weight a few times a week. The trend smooths out daily swings.</EmptyState>
          ) : (
            <div className="rounded-sm border border-line bg-canvas-low p-4">
              <LineChart
                title={`7-day average bodyweight in ${unitLabel(unit)}`}
                unit={unitLabel(unit)}
                points={s.series.map((p) => ({ label: day(p.date), value: kgToDisplay(p.avg7, unit) }))}
              />
              <details className="mt-3">
                <summary className="cursor-pointer font-mono text-label-sm text-primary">Show Weigh-In Log ({s.series.length})</summary>
                <div className="mt-2 overflow-x-auto rounded-sm border border-line bg-card">
                  <table className={TABLE}>
                    <thead className={THEAD}>
                      <tr>
                        <th scope="col" className={TH}>Date</th>
                        <th scope="col" className={TH_NUM}>Weight</th>
                        <th scope="col" className={TH_NUM}>7-Day Avg</th>
                        <th scope="col" className={TH}>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...s.series].reverse().map((p) => (
                        <tr key={p.date} className={TR}>
                          <td className={TD}>{day(p.date)}</td>
                          <td className={TD_NUM}>{w(p.kg)}</td>
                          <td className={clsx(TD_NUM, 'text-muted')}>{w(p.avg7)}</td>
                          <td className={clsx(TD, 'text-right')}>
                            <DeleteEntryButton date={p.date} label={day(p.date)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          )}

          <div className="border-t border-line pt-4">
            <GoalForm goal={trend.goal} unit={unit} />
          </div>
        </section>

        {/* Bottom 2-Column Split: Readiness Survey + Privacy-Locked Cycle Context */}
        <ReadinessCyclePanel />

        {/* Progress Photos */}
        <section aria-labelledby="photos-heading" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="photos-heading" className="font-display text-title-lg text-ink">
                Progress Photos (Private by Default)
              </h2>
              <p className="text-label-md text-muted">
                EXIF stripped locally before upload. {today.coachName ? `${today.coachName} sees only the photos you explicitly share.` : 'Only you can view them.'}
              </p>
            </div>
            <PhotoUpload today={todayIso} coachName={today.coachName} disabledReason={photos.storageConfigured ? null : 'Photo storage is not configured on this server.'} />
          </div>

          {!photos.storageConfigured ? (
            <p role="status" className="rounded-md border border-amber/40 bg-amber-bg px-4 py-3 text-ui text-amber">
              Photo storage is not configured on this server, so photos are off.
            </p>
          ) : photos.photos.length === 0 ? (
            <EmptyState title="No photos yet">Take front, side and back photos in consistent lighting every few weeks.</EmptyState>
          ) : (
            <>
              <Panel title="Side-by-Side Photo Compare">
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
