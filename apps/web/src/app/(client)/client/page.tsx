import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import { Role } from '@coaching/shared';
import type { TodayExercise, WeightUnit } from '@coaching/shared';
import { ACTION_META } from '@/components/progression/ActionBadge';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { meApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { formatClock } from '@/components/logger/logger-model';
import { LimitationBadge } from '@/components/limitations/LimitationBadge';
import { WhyButton } from './_components/WhyButton';
import { bannerLabel, bannerText, targetSourceNote, todayTargetLine } from './_components/today-model';

function sourceLine(exercise: TodayExercise): string | null {
  const t = exercise.target;
  if (t.source === 'COACH_OVERRIDE') return 'Coach override';
  if (t.source === 'RECOMMENDATION') return 'Engine call';
  return targetSourceNote(t.source);
}

function ExerciseRow({ exercise, unit, coachName }: { exercise: TodayExercise; unit: WeightUnit; coachName: string | null }) {
  const t = exercise.target;
  const line = todayTargetLine(t, unit);
  const note = sourceLine(exercise);
  return (
    <li className="flex min-h-14 items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <Link href={`/client/lifts/${exercise.exerciseId}`} className="text-ui font-medium hover:underline">
            {exercise.name}
          </Link>
          {exercise.limitation ? <LimitationBadge flag={exercise.limitation} /> : null}
        </span>
        <p className="text-meta text-faint">
          <span className="font-mono">
            {exercise.sets} {exercise.sets === 1 ? 'set' : 'sets'}
            {exercise.restSeconds ? ` · rest ${formatClock(exercise.restSeconds)}` : ''}
          </span>
          {note ? ` · ${note}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className={'font-mono text-[20px] leading-6'}>{line || <span className="text-ui text-faint">No target</span>}</span>
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
  const today = await meApi.today();
  const unit = user.weightUnit;
  const workout = today.state === 'READY' ? today.workout : null;
  const banner = today.banner;
  const meta = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const weekLine =
    today.blockName && today.currentWeek !== null
      ? `${today.blockName} · Week ${today.currentWeek}${today.totalWeeks ? ` of ${today.totalWeeks}` : ''}`
      : null;
  const first = workout?.exercises[0];
  const firstLine = first ? todayTargetLine(first.target, unit) : '';
  const progress = today.weekProgress;

  const secondary =
    today.lastSessionId ? (
      <Link href="/client/log?repeat=1" className={buttonClass('secondary', 'w-full', 'lg')}>
        Repeat last session
      </Link>
    ) : null;

  return (
    <>
      <PageHeader title="Today" meta={meta} />
      <div className="max-w-xl space-y-6">
        {banner ? (
          <section aria-label="Target update" className={clsx('border-l-2 bg-card px-4 py-3', ACTION_META[banner.action].rule)}>
            <p className={clsx('font-mono text-micro uppercase', ACTION_META[banner.action].text)}>{bannerLabel(banner.action)}</p>
            <p className="text-ui">{bannerText(banner, unit)}</p>
          </section>
        ) : null}

        {workout ? (
          <>
            <section aria-labelledby="session-heading" className="space-y-1">
              <p className="font-mono text-micro uppercase text-faint">
                {weekLine ?? 'Today’s session'}
                {progress && progress.total > 0 ? ` · ${progress.completed}/${progress.total} done this week` : ''}
              </p>
              <h2 id="session-heading" className="font-display text-title font-semibold">
                {workout.name}
              </h2>
            </section>

            {first && firstLine ? (
              <section aria-label="First up" className="border-y border-line py-4">
                <p className="font-mono text-micro uppercase text-muted">First up</p>
                <p className="mt-1 text-ui font-medium">{first.name}</p>
                <p className="mt-1 font-mono text-metric-lg">{firstLine}</p>
              </section>
            ) : null}

            <ul className="divide-y divide-line border-y border-line">
              {workout.exercises.map((e) => (
                <ExerciseRow key={e.workoutExerciseId} exercise={e} unit={unit} coachName={today.coachName} />
              ))}
            </ul>

            <div className="sticky bottom-20 space-y-2 md:static">
              <Link href="/client/log" className={buttonClass('primary', 'w-full', 'lg')}>
                Start session
                <Icon icon={ArrowRight} />
              </Link>
              {secondary}
            </div>
          </>
        ) : today.state === 'WEEK_COMPLETE' ? (
          <>
            <EmptyState title={`All ${progress?.total ?? ''} sessions this week are logged.`.replace('All  ', 'All ')}>
              Your next session opens when the new week starts. You can still log extra work.
            </EmptyState>
            <div className="space-y-2">
              <Link href="/client/log" className={buttonClass('primary', 'w-full', 'lg')}>
                Log a session
              </Link>
              {secondary}
            </div>
          </>
        ) : (
          <>
            <EmptyState title="No program yet">
              {today.coachName ? `${today.coachName} hasn’t assigned you a program yet.` : 'Your coach hasn’t assigned you a program yet.'} You can still log a session on your
              own.
            </EmptyState>
            <div className="space-y-2">
              <Link href="/client/log" className={buttonClass('primary', 'w-full', 'lg')}>
                Log a session
              </Link>
              {secondary}
            </div>
          </>
        )}
      </div>
    </>
  );
}
