import { ArrowRight, Calculator, MessageSquare, Sparkles, Video } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import { Role } from '@coaching/shared';
import type { TodayExercise, WeightUnit } from '@coaching/shared';
import { ACTION_META } from '@/components/progression/ActionBadge';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { bodyApi, checkInsApi, liveApi, meApi, nutritionApi, readinessApi } from '@/lib/api/endpoints';
import { dayTotals, fmt, litres, waterTotal } from '@/components/nutrition/nutrition-model';
import { NUTRITION_LIMITS, READINESS_BAND_LABELS, readinessBand } from '@coaching/shared';
import { requireUser } from '@/lib/auth';
import { formatClock } from '@/components/logger/logger-model';
import { LimitationBadge } from '@/components/limitations/LimitationBadge';
import { CoachCues } from '@/components/logger/CoachCues';
import { formatWeight } from '@/lib/units';
import { WhyButton } from './_components/WhyButton';
import { bannerLabel, bannerText, targetSourceNote, todayTargetLine } from './_components/today-model';

function sourceLine(exercise: TodayExercise): string | null {
  const t = exercise.target;
  if (t.source === 'COACH_OVERRIDE') return 'Coach override';
  if (t.source === 'RECOMMENDATION') return 'Engine call';
  return targetSourceNote(t.source);
}

function ExerciseRow({ index, exercise, unit, coachName }: { index: number; exercise: TodayExercise; unit: WeightUnit; coachName: string | null }) {
  const t = exercise.target;
  const line = todayTargetLine(t, unit);
  const note = sourceLine(exercise);
  const highlighted = t.source === 'RECOMMENDATION' || t.source === 'COACH_OVERRIDE';

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 py-3.5">
      <div className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <Link href={`/client/lifts/${exercise.exerciseId}`} className="font-sans text-label-md font-semibold text-ink hover:text-primary hover:underline">
            {index + 1}. {exercise.name}
          </Link>
          {exercise.limitation ? <LimitationBadge flag={exercise.limitation} /> : null}
        </span>
        <p className="mt-0.5 text-label-sm text-muted">
          <span className="font-mono">
            {exercise.sets} {exercise.sets === 1 ? 'set' : 'sets'}
            {exercise.restSeconds ? ` · ${formatClock(exercise.restSeconds)} rest` : ''}
          </span>
          {note ? ` · ${note}` : ''}
        </p>
        {exercise.carryForward.length > 0 ? (
          <div className="mt-2">
            <CoachCues cues={exercise.carryForward} coachName={coachName} label={`Coach notes for ${exercise.name}`} />
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className={clsx('font-mono text-label-md tabular-nums', highlighted ? 'text-primary' : 'text-ink')}>
          {line || <span className="text-muted">Pick load</span>}
        </span>
        {exercise.recommendationId ? (
          <WhyButton
            recommendationId={exercise.recommendationId}
            exerciseName={exercise.name}
            unit={unit}
            coachName={coachName}
            override={
              t.source === 'COACH_OVERRIDE'
                ? { weightKg: t.weightKg, repsMin: t.repsMin, repsMax: t.repsMax, rpe: t.rpe, note: t.note, byName: t.overriddenBy?.name ?? null, at: t.overriddenAt }
                : null
            }
          />
        ) : null}
      </div>
    </li>
  );
}

export default async function ClientHome() {
  const user = await requireUser(Role.CLIENT);
  // Side-rail telemetry (live session, check-ins, bodyweight, nutrition) is best-effort and never blocks Today.
  const [today, live, checkIns, body, food, readiness] = await Promise.all([
    meApi.today(),
    liveApi.mine().then((r) => r.session).catch(() => null),
    checkInsApi.mine().catch(() => ({ due: [], recent: [] })),
    bodyApi.trend().catch(() => null),
    nutritionApi.day().catch(() => null),
    readinessApi.history().catch(() => null),
  ]);

  const unit = user.weightUnit;
  const workout = today.state === 'READY' ? today.workout : null;
  const banner = today.banner;
  const dateTitle = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const weekLine =
    today.blockName && today.currentWeek !== null
      ? `${today.blockName} · Week ${today.currentWeek}${today.totalWeeks ? ` of ${today.totalWeeks}` : ''}`
      : null;
  const progress = today.weekProgress;
  const workingSets = workout ? workout.exercises.reduce((sum, e) => sum + e.sets, 0) : 0;
  const estMinutes = workout ? Math.max(25, Math.round(workingSets * 3.8)) : 0;
  const latestWeight = body?.entries.at(-1)?.weightKg ?? null;
  const dueCheckIn = checkIns.due[0] ?? null;
  const fuel = food ? dayTotals(food.entries) : null;
  const waterMl = food ? waterTotal(food.water) : 0;
  const waterGoalMl = food?.target?.waterMl ?? NUTRITION_LIMITS.defaultWaterMl;
  const ready = readiness?.today ?? null;
  const fuelLogged = (food?.entries.length ?? 0) > 0 || waterMl > 0;

  const secondary =
    today.lastSessionId ? (
      <Link href="/client/log?repeat=1" className={buttonClass('secondary', undefined, 'md')}>
        Repeat Last Session
      </Link>
    ) : null;

  return (
    <>
      <PageHeader
        title={`Today — ${dateTitle}`}
        meta={weekLine ? <Badge tone="emerald">{weekLine}</Badge> : undefined}
        actions={
          <>
            {today.coachName ? (
              <Link href="/client/messages" className={buttonClass('secondary', undefined, 'sm')}>
                <Icon icon={MessageSquare} />
                Ask My Coach
              </Link>
            ) : null}
            <Link href="/client/log" className={buttonClass('primary', undefined, 'sm')}>
              Start Session
            </Link>
          </>
        }
      />

      <div className="space-y-6">
        {live ? (
          <Link
            href="/client/live"
            className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-primary/40 bg-card p-4 transition-colors hover:bg-raised"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary-container text-primary">
                <Icon icon={Video} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary px-2 py-0.5 font-mono text-label-sm text-primary-ink">LIVE NOW</span>
                  <p className="font-sans text-label-md font-semibold text-ink">{live.title}</p>
                </div>
                <p className="text-label-md text-muted">Active session with {live.coachName}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-canvas-low px-4 py-1.5 font-sans text-label-sm font-semibold text-primary">
              Join Live
              <Icon icon={ArrowRight} size={14} />
            </span>
          </Link>
        ) : null}

        {banner ? (
          <section
            aria-label="Target update"
            className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-primary/40 bg-card p-4"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary-container text-primary">
                <Icon icon={Sparkles} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary px-2 py-0.5 font-mono text-label-sm text-primary-ink">UPDATED</span>
                  <p className={clsx('font-mono text-label-sm uppercase', ACTION_META[banner.action].text)}>{bannerLabel(banner.action)}</p>
                </div>
                <p className="mt-0.5 text-label-md text-ink">{bannerText(banner, unit)}</p>
              </div>
            </div>
            <Link
              href="/client/history?tab=charts"
              className="shrink-0 rounded-full border border-line bg-canvas-low px-4 py-1.5 font-sans text-label-sm font-semibold text-primary hover:border-primary"
            >
              View Trends
            </Link>
          </section>
        ) : null}

        {/* Primary Grid: Today's Workout (8 cols) + Readiness & Check-in (4 cols) */}
        <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
          {/* Left (8 cols): Scheduled Workout Card + Quick Tools Strip */}
          <div className="flex flex-col gap-6 xl:col-span-8">
            {workout ? (
              <article aria-labelledby="session-heading" className="flex flex-col gap-5 rounded-md border border-line bg-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
                  <div>
                    <span className="font-mono text-label-sm uppercase text-primary">
                      SCHEDULED TODAY{progress && progress.total > 0 ? ` · ${progress.completed}/${progress.total} DONE THIS WEEK` : ''}
                    </span>
                    <h2 id="session-heading" className="mt-0.5 font-display text-headline-md text-ink">
                      {workout.name}
                    </h2>
                    <p className="mt-1 font-mono text-label-sm text-muted">
                      {workout.exercises.length} {workout.exercises.length === 1 ? 'Exercise' : 'Exercises'} · {workingSets} Working Sets · Est. {estMinutes} min
                    </p>
                  </div>
                  <Link href="/client/log" className={buttonClass('primary', 'shrink-0', 'md')}>
                    Start Session
                    <Icon icon={ArrowRight} />
                  </Link>
                </div>

                <CoachCues cues={workout.carryForward} coachName={today.coachName} label="Coach notes for this session" />

                <ul className="divide-y divide-line">
                  {workout.exercises.map((e, idx) => (
                    <ExerciseRow key={e.workoutExerciseId} index={idx} exercise={e} unit={unit} coachName={today.coachName} />
                  ))}
                </ul>

                <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
                  <Link href="/client/log" className={buttonClass('primary', 'flex-1 sm:flex-none', 'lg')}>
                    Start Session
                    <Icon icon={ArrowRight} />
                  </Link>
                  {secondary}
                </div>
              </article>
            ) : today.state === 'WEEK_COMPLETE' ? (
              <div className="space-y-4">
                <EmptyState title={`All ${progress?.total ?? ''} sessions this week are logged.`.replace('All  ', 'All ')}>
                  Your next session opens when the new week starts. You can still log extra work or run a saved template.
                </EmptyState>
                <div className="flex flex-wrap gap-3">
                  <Link href="/client/log" className={buttonClass('primary', undefined, 'lg')}>
                    Log Extra Session
                  </Link>
                  <Link href="/client/templates" className={buttonClass('secondary', undefined, 'lg')}>
                    Open Templates
                  </Link>
                  {secondary}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <EmptyState title="No program yet">
                  {today.coachName ? `${today.coachName} hasn’t assigned you a program yet.` : 'Your coach hasn’t assigned you a program yet.'} You can still log a session on your own.
                </EmptyState>
                <div className="flex flex-wrap gap-3">
                  <Link href="/client/log" className={buttonClass('primary', undefined, 'lg')}>
                    Log a Session
                  </Link>
                  <Link href="/client/templates" className={buttonClass('secondary', undefined, 'lg')}>
                    Browse Templates
                  </Link>
                  {secondary}
                </div>
              </div>
            )}

            {/* Quick Training & Nutrition Strip */}
            <div className="flex flex-col gap-4 rounded-md border border-line bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-title-md text-ink">Quick Training &amp; Nutrition Tools</h2>
                <Link href="/client/tools" className="inline-flex items-center gap-1 font-sans text-label-sm font-semibold text-primary hover:underline">
                  <Icon icon={Calculator} size={14} />
                  Open Calculators
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Link href="/client/records" className="rounded-sm border border-line bg-canvas-low p-3 transition-colors hover:border-primary/40">
                  <span className="font-mono text-label-sm uppercase text-muted">PR MATRIX</span>
                  <p className="mt-0.5 font-display text-title-md text-primary">1RM – 20RM</p>
                  <p className="font-mono text-label-sm text-muted">Net progression</p>
                </Link>
                <Link href="/client/templates" className="rounded-sm border border-line bg-canvas-low p-3 transition-colors hover:border-primary/40">
                  <span className="font-mono text-label-sm uppercase text-muted">GYM MODE</span>
                  <p className="mt-0.5 font-display text-title-md text-ink">Templates</p>
                  <p className="font-mono text-label-sm text-emerald">Travel &amp; Rack</p>
                </Link>
                <Link href="/client/analytics/muscles" className="rounded-sm border border-line bg-canvas-low p-3 transition-colors hover:border-primary/40">
                  <span className="font-mono text-label-sm uppercase text-muted">MUSCLE MAP · PRO</span>
                  <p className="mt-0.5 font-display text-title-md text-sky">2D Heatmap</p>
                  <p className="font-mono text-label-sm text-muted">Weekly sets</p>
                </Link>
                <Link href="/client/videos" className="rounded-sm border border-line bg-canvas-low p-3 transition-colors hover:border-primary/40">
                  <span className="font-mono text-label-sm uppercase text-muted">FORM CHECKS</span>
                  <p className="mt-0.5 font-display text-title-md text-amber">Set Clips</p>
                  <p className="font-mono text-label-sm text-muted">L/R frame sync</p>
                </Link>
              </div>
            </div>
          </div>

          {/* Right (4 cols): Body & Readiness + Upcoming Check-in */}
          <div className="flex flex-col gap-6 xl:col-span-4">
            <div className="flex flex-col gap-4 rounded-md border border-line bg-card p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-title-md text-ink">Body &amp; Pre-Workout Readiness</h2>
                <Badge tone={ready && ready.score < 50 ? 'red' : ready && ready.score < 75 ? 'amber' : 'emerald'}>{ready ? `Readiness ${ready.score}` : latestWeight ? formatWeight(latestWeight, unit) : 'Check in'}</Badge>
              </div>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between rounded-sm border border-line bg-canvas-low px-3.5 py-2.5">
                  <span className="text-label-md text-muted">Latest Weigh-in</span>
                  <span className="font-mono text-label-md text-ink">{latestWeight ? formatWeight(latestWeight, unit) : 'Not logged yet'}</span>
                </div>
                <div className="flex items-center justify-between rounded-sm border border-line bg-canvas-low px-3.5 py-2.5">
                  <span className="text-label-md text-muted">Week Adherence</span>
                  <span className="font-mono text-label-md text-emerald">
                    {progress && progress.total > 0 ? `${progress.completed} / ${progress.total} sessions` : 'Active'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-sm border border-line bg-canvas-low px-3.5 py-2.5">
                  <span className="text-label-md text-muted">Readiness</span>
                  <span className={clsx('font-mono text-label-md', !ready ? 'text-muted' : ready.score >= 75 ? 'text-emerald' : ready.score >= 50 ? 'text-amber' : 'text-rose')}>
                    {ready ? `${ready.score} / 100 · ${READINESS_BAND_LABELS[readinessBand(ready.score)]}` : 'Not checked in'}
                  </span>
                </div>
              </div>
              <Link
                href="/client/body"
                className="w-full rounded-full border border-line bg-canvas-low py-2 text-center font-sans text-label-sm font-semibold text-ink transition-colors hover:border-primary"
              >
                Update Weight &amp; Readiness
              </Link>
            </div>

            {food ? (
              <section aria-labelledby="fuel-heading" className="flex flex-col gap-4 rounded-md border border-line bg-card p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 id="fuel-heading" className="font-display text-title-md text-ink">
                    Nutrition &amp; Hydration
                  </h2>
                  <Badge tone={fuelLogged ? 'emerald' : 'slate'}>{fuelLogged ? 'Logged today' : 'Not logged yet'}</Badge>
                </div>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between rounded-sm border border-line bg-canvas-low px-3.5 py-2.5">
                    <span className="text-label-md text-muted">Calories</span>
                    <span className="font-mono text-label-md text-primary">
                      {fmt(fuel?.kcal ?? 0)}
                      {food.target ? ` / ${fmt(food.target.kcal)}` : ''} kcal
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-sm border border-line bg-canvas-low px-3.5 py-2.5">
                    <span className="text-label-md text-muted">Protein</span>
                    <span className="font-mono text-label-md text-sky">
                      {fmt(fuel?.proteinG ?? 0)}
                      {food.target ? ` / ${fmt(food.target.proteinG)}` : ''} g
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-sm border border-line bg-canvas-low px-3.5 py-2.5">
                    <span className="text-label-md text-muted">Water</span>
                    <span className="font-mono text-label-md text-sky">
                      {litres(waterMl)} / {litres(waterGoalMl)} L
                    </span>
                  </div>
                </div>
                <Link
                  href="/client/nutrition"
                  className="w-full rounded-full border border-line bg-canvas-low py-2 text-center font-sans text-label-sm font-semibold text-ink transition-colors hover:border-primary"
                >
                  {fuelLogged ? 'Open Food Log' : 'Log Food & Water'}
                </Link>
              </section>
            ) : null}

            <div className="flex flex-col gap-3 rounded-md border border-line bg-card p-5">
              <div className="flex items-center justify-between gap-2">
                <span className={clsx('font-mono text-label-sm uppercase', dueCheckIn ? 'text-amber' : 'text-emerald')}>
                  {dueCheckIn ? 'UPCOMING CHECK-IN' : 'CHECK-IN STATUS'}
                </span>
                <span className="font-mono text-label-sm text-muted">
                  {dueCheckIn ? `Due ${dueCheckIn.periodDate}` : 'All caught up'}
                </span>
              </div>
              <h3 className="font-display text-title-md text-ink">{dueCheckIn ? dueCheckIn.templateTitle : 'Weekly Coach Check-in'}</h3>
              <p className="text-label-md text-muted">
                Includes 7-day rolling weight average, recovery notes, and optional progress photos.
              </p>
              <Link
                href="/client/check-in"
                className="w-full rounded-full border border-line bg-canvas-low py-2 text-center font-sans text-label-sm font-semibold text-primary transition-colors hover:border-primary"
              >
                {dueCheckIn ? 'Submit Check-in' : 'View Check-ins'}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
