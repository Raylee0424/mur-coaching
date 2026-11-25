import clsx from 'clsx';
import Link from 'next/link';
import type { GroupLeaderboardDto, GroupSummaryDto, HealthOverviewDto } from '@coaching/shared';
import { HEALTH_SOURCE_LABELS } from '@coaching/shared';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { TABLE, TD, TD_NUM, TH, TH_NUM, THEAD, TR } from '@/components/ui/table';
import { formatDate } from '@/lib/format';
import { HealthFileImport, ManualEntryForm, ShareStatsToggle, StepGoalForm } from './HealthControls';
import { formatSleep, formatSteps } from './health-import';

export interface StepBoard {
  group: GroupSummaryDto;
  board: GroupLeaderboardDto;
}

/**
 * `athlete_web_step_tracking_health_sync_weekly_check_in`, Steps tab: goal ring/bar with streak, sync cards (Apple
 * Health export import, Health Connect standby, CSV), manual entry, and the opt-in group step leaderboard.
 */
export function HealthOverview({
  overview,
  board,
  groups,
  today,
  basePath,
}: {
  overview: HealthOverviewDto;
  board: StepBoard | null;
  groups: GroupSummaryDto[];
  today: string;
  /** Page URL the group switcher links back to, e.g. `/client/check-in?tab=steps`. */
  basePath: string;
}) {
  const steps = overview.today.steps ?? 0;
  const pct = Math.min(100, Math.round((steps / overview.dailyStepGoal) * 100));
  const apple = overview.days.find((d) => d.sources.includes('APPLE_HEALTH'));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        <section aria-labelledby="goal-heading" className="flex flex-col justify-between gap-4 rounded-md border border-line bg-card p-6 lg:col-span-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span id="goal-heading" className="font-mono text-label-sm uppercase text-primary">
                DAILY STEP GOAL
              </span>
              <p className="mt-0.5 font-display text-headline-md tabular-nums text-ink">
                {formatSteps(steps)} <span className="text-title-md text-muted">/ {formatSteps(overview.dailyStepGoal)}</span>
              </p>
            </div>
            <Badge tone={overview.streakDays > 0 ? 'signal' : 'slate'}>{`${overview.streakDays}-Day Streak`}</Badge>
          </div>
          <div
            role="progressbar"
            aria-label="Today's steps toward goal"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            className="h-2.5 w-full overflow-hidden rounded-full border border-line bg-canvas-low"
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <p className="font-mono text-label-sm tabular-nums text-muted">
            {overview.remainingToday > 0 ? `${formatSteps(overview.remainingToday)} steps remaining today` : 'Goal met today'} · 7d avg:{' '}
            {overview.avg7Steps === null ? '—' : `${formatSteps(overview.avg7Steps)}/day`}
          </p>
          <StepGoalForm goal={overview.dailyStepGoal} />
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
          <article className="flex flex-col justify-between gap-4 rounded-md border border-line bg-card p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-title-md text-ink">Apple Health</h3>
              <Badge tone={apple ? 'emerald' : 'slate'}>{apple ? 'Synced' : 'Export import'}</Badge>
            </div>
            <dl className="grid grid-cols-3 gap-2">
              {[
                ['STEPS', formatSteps(overview.today.steps)],
                ['SLEEP', formatSleep(overview.today.sleepMinutes)],
                ['HRV', overview.today.hrvMs === null ? '—' : `${overview.today.hrvMs} ms`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-sm border border-line bg-canvas-low p-2">
                  <dt className="font-mono text-label-sm text-muted">{k}</dt>
                  <dd className="font-mono text-label-md tabular-nums text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-label-sm text-muted">
              On iPhone: Health → profile → Export All Health Data, then pick <span className="font-mono">export.xml</span> from the zip. It is read on this device; only daily totals are sent.
            </p>
            <HealthFileImport kind="apple" label="Import export.xml" />
            <p className="font-mono text-label-sm text-muted">{overview.lastSyncedAt ? `Last synced ${formatDate(overview.lastSyncedAt)}` : 'Not synced yet'}</p>
          </article>

          <article className="flex flex-col justify-between gap-4 rounded-md border border-line bg-card p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-title-md text-ink">Health Connect</h3>
              <Badge tone="slate">Standby</Badge>
            </div>
            <p className="text-label-md text-muted">
              The Android &amp; WearOS bridge for steps, sleep stages and resting HR arrives with the mobile app. Until then, import a daily CSV with
              columns <span className="font-mono">date, steps, sleep_minutes, hrv_ms, resting_hr</span>.
            </p>
            <HealthFileImport kind="csv" label="Import daily CSV" />
          </article>
        </div>
      </div>

      <section aria-labelledby="manual-heading" className="rounded-md border border-line bg-card p-6">
        <h2 id="manual-heading" className="mb-4 font-display text-title-md text-ink">
          Log a day manually
        </h2>
        <ManualEntryForm today={today} />
      </section>

      <StepLeaderboard board={board} groups={groups} basePath={basePath} />
    </div>
  );
}

function StepLeaderboard({ board, groups, basePath }: { board: StepBoard | null; groups: GroupSummaryDto[]; basePath: string }) {
  return (
    <section aria-labelledby="board-heading" className="overflow-hidden rounded-md border border-line bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
        <h2 id="board-heading" className="font-display text-title-md text-ink">
          Group Step Leaderboard (7-Day Average)
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {groups.length > 1
            ? groups.map((g) => (
                <Link
                  key={g.id}
                  href={`${basePath}${basePath.includes('?') ? '&' : '?'}group=${encodeURIComponent(g.id)}`}
                  aria-current={board?.group.id === g.id ? 'true' : undefined}
                  className={clsx(
                    'rounded-full border px-3 py-1 font-mono text-label-sm uppercase',
                    board?.group.id === g.id ? 'border-primary text-primary' : 'border-line text-muted hover:text-ink',
                  )}
                >
                  {g.name}
                </Link>
              ))
            : board ? <Badge tone="signal">{board.group.name.toUpperCase()}</Badge> : null}
          <Link href="/client/groups" className={buttonClass('ghost', undefined, 'sm')}>
            Training groups
          </Link>
        </div>
      </div>
      {!board ? (
        <p className="px-6 py-5 text-ui text-muted">
          Join or create a private training group to compare steps. Leaderboards are opt-in: nothing is shared until you turn it on for a group.
        </p>
      ) : (
        <>
          {!board.board.viewerSharing ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-canvas-low px-6 py-3">
              <p className="text-label-md text-muted">You are not on this board. Members see your 7-day step average, streak and new PR count only after you opt in.</p>
              <ShareStatsToggle groupId={board.group.id} sharing={false} />
            </div>
          ) : null}
          {board.board.rows.length === 0 ? (
            <p className="px-6 py-5 text-ui text-muted">No one in this group shares stats yet.</p>
          ) : (
            <div className="relative overflow-x-auto">
              <table className={TABLE}>
                <thead className={THEAD}>
                  <tr>
                    <th scope="col" className={TH}>RANK</th>
                    <th scope="col" className={TH}>ATHLETE</th>
                    <th scope="col" className={TH_NUM}>7D AVG STEPS</th>
                    <th scope="col" className={TH_NUM}>STREAK</th>
                  </tr>
                </thead>
                <tbody>
                  {board.board.rows.map((r) => (
                    <tr key={r.userId} className={clsx(TR, r.isYou && 'bg-primary-container/30')}>
                      <td className={clsx(TD, 'font-mono', r.rank === 1 ? 'text-primary' : 'text-muted')}>{String(r.rank).padStart(2, '0')}</td>
                      <td className={clsx(TD, 'text-ink')}>{r.isYou ? `${r.name} (You)` : r.name}</td>
                      <td className={TD_NUM}>{formatSteps(r.avg7Steps)}</td>
                      <td className={TD_NUM}>{`${r.streakDays} days`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function HealthHistory({ overview }: { overview: HealthOverviewDto }) {
  if (overview.days.length === 0) return null;
  return (
    <section aria-labelledby="history-heading" className="overflow-hidden rounded-md border border-line bg-card">
      <h2 id="history-heading" className="border-b border-line px-6 py-4 font-display text-title-md text-ink">
        Daily history
      </h2>
      <div className="relative overflow-x-auto">
        <table className={TABLE}>
          <thead className={THEAD}>
            <tr>
              <th scope="col" className={TH}>DATE</th>
              <th scope="col" className={TH_NUM}>STEPS</th>
              <th scope="col" className={TH_NUM}>SLEEP</th>
              <th scope="col" className={TH_NUM}>HRV</th>
              <th scope="col" className={TH_NUM}>RESTING HR</th>
              <th scope="col" className={TH}>SOURCES</th>
            </tr>
          </thead>
          <tbody>
            {overview.days.map((d) => (
              <tr key={d.date} className={TR}>
                <td className={clsx(TD, 'font-mono text-ink')}>{d.date}</td>
                <td className={clsx(TD_NUM, (d.steps ?? 0) >= overview.dailyStepGoal ? 'text-primary' : 'text-ink')}>{formatSteps(d.steps)}</td>
                <td className={TD_NUM}>{formatSleep(d.sleepMinutes)}</td>
                <td className={TD_NUM}>{d.hrvMs === null ? '—' : `${d.hrvMs} ms`}</td>
                <td className={TD_NUM}>{d.restingHr === null ? '—' : `${d.restingHr} bpm`}</td>
                <td className={clsx(TD, 'text-label-sm text-muted')}>{d.sources.map((s) => HEALTH_SOURCE_LABELS[s]).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
