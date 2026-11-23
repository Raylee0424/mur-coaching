import Link from 'next/link';
import { Role } from '@coaching/shared';
import type { TodayDto, TodayExercise, WeightUnit } from '@coaching/shared';
import { buttonClass } from '@/components/ui/Button';
import { meApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { formatClock } from '@/components/logger/logger-model';
import { ACTION_TONE } from './_components/action-tone';
import { Greeting } from './_components/Greeting';
import { WhyButton } from './_components/WhyButton';
import { bannerLabel, bannerText, initials, targetSourceNote, todayTargetLine } from './_components/today-model';

const label = 'text-[11px] font-semibold uppercase tracking-wider';

function Chevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function ExerciseRow({ exercise, unit, coachName }: { exercise: TodayExercise; unit: WeightUnit; coachName: string | null }) {
  const t = exercise.target;
  const line = todayTargetLine(t, unit);
  const note = targetSourceNote(t.source);
  const changed = t.source === 'COACH_OVERRIDE' || t.source === 'RECOMMENDATION';
  return (
    <li className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-line bg-canvas-low p-3.5">
      <div className="min-w-0 space-y-0.5">
        <Link
          href={`/client/lifts/${exercise.exerciseId}`}
          className="block text-sm font-semibold hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {exercise.name}
        </Link>
        <div className="flex flex-wrap items-center gap-x-2.5">
          <span className={`text-xs tabular ${changed ? 'text-primary' : 'text-muted'}`}>
            {line ? `Target: ${line}` : 'No target yet'}
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
        <p className="text-xs text-muted tabular">
          {exercise.sets} {exercise.sets === 1 ? 'set' : 'sets'}
          {exercise.restSeconds ? ` · Rest ${formatClock(exercise.restSeconds)}` : ''}
          {note ? ` · ${note}` : ''}
        </p>
      </div>
      <Link
        href={`/client/lifts/${exercise.exerciseId}`}
        aria-label={`Open ${exercise.name} details`}
        className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Chevron />
      </Link>
    </li>
  );
}

function WeekProgress({ today }: { today: TodayDto }) {
  const p = today.weekProgress;
  if (!p || p.total === 0) return null;
  return (
    <div className="space-y-1.5">
      <div
        role="progressbar"
        aria-label="Sessions done this week"
        aria-valuemin={0}
        aria-valuemax={p.total}
        aria-valuenow={p.completed}
        className="h-1.5 overflow-hidden rounded-full bg-raised"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((p.completed / p.total) * 100)}%` }} />
      </div>
      <p className="text-xs text-muted tabular">
        {p.completed} of {p.total} sessions done this week
      </p>
    </div>
  );
}

export default async function ClientHome() {
  const user = await requireUser(Role.CLIENT);
  const today = await meApi.today();
  const unit = user.weightUnit;
  const eyebrow =
    today.blockName && today.currentWeek !== null
      ? `${today.blockName} · Week ${today.currentWeek}${today.totalWeeks ? ` of ${today.totalWeeks}` : ''}`
      : 'MUR Coaching';
  const workout = today.state === 'READY' ? today.workout : null;
  const banner = today.banner;
  const tone = banner ? ACTION_TONE[banner.action] : null;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <header className="flex items-center justify-between gap-4 border-b border-line pb-4">
        <div className="min-w-0">
          <p className={`${label} truncate text-primary`}>{eyebrow}</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold">
            <Greeting name={today.greetingName} />
          </h1>
        </div>
        <span
          aria-hidden="true"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-card text-xs font-semibold text-primary"
        >
          {initials(today.greetingName)}
        </span>
      </header>

      <WeekProgress today={today} />

      {workout ? (
        <section aria-labelledby="session-heading" className="space-y-4 rounded-lg border border-line bg-card p-5">
          <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
            <div>
              <p className={`${label} text-muted`}>Today&apos;s session</p>
              <h2 id="session-heading" className="text-lg font-bold">
                {workout.name}
              </h2>
            </div>
            <span className="rounded-full border border-line bg-canvas-low px-3 py-1 text-xs font-semibold text-muted tabular">
              {workout.exercises.length} {workout.exercises.length === 1 ? 'Exercise' : 'Exercises'}
            </span>
          </div>
          <ul className="space-y-3">
            {workout.exercises.map((e) => (
              <ExerciseRow key={e.workoutExerciseId} exercise={e} unit={unit} coachName={today.coachName} />
            ))}
          </ul>
          <div className="flex flex-col gap-3 pt-2">
            <Link href="/client/log" className={buttonClass('primary', 'min-h-12 w-full text-base')}>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Start Workout
            </Link>
            {today.lastSessionId ? (
              <Link href="/client/log?repeat=1" className={buttonClass('secondary', 'min-h-12 w-full text-base')}>
                Repeat Last Session
              </Link>
            ) : null}
          </div>
        </section>
      ) : today.state === 'WEEK_COMPLETE' ? (
        <section className="space-y-4 rounded-lg border border-line bg-card p-5">
          <div>
            <p className={`${label} text-emerald`}>Week complete</p>
            <h2 className="mt-1 text-lg font-bold">All sessions done. Nice work.</h2>
            <p className="mt-1 text-sm text-muted">Your next session unlocks when the new week starts. You can still log extra work.</p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/client/log" className={buttonClass('primary', 'min-h-12 w-full text-base')}>
              Log a session
            </Link>
            {today.lastSessionId ? (
              <Link href="/client/log?repeat=1" className={buttonClass('secondary', 'min-h-12 w-full text-base')}>
                Repeat Last Session
              </Link>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="space-y-4 rounded-lg border border-dashed border-line bg-card p-5">
          <div>
            <h2 className="text-lg font-bold">No program yet</h2>
            <p className="mt-1 text-sm text-muted">
              {today.coachName ? `${today.coachName} hasn't assigned you a program yet.` : "You don't have a program assigned yet."} You can
              still log a session on your own.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/client/log" className={buttonClass('primary', 'min-h-12 w-full text-base')}>
              Log a session
            </Link>
            {today.lastSessionId ? (
              <Link href="/client/log?repeat=1" className={buttonClass('secondary', 'min-h-12 w-full text-base')}>
                Repeat Last Session
              </Link>
            ) : null}
          </div>
        </section>
      )}

      {banner && tone ? (
        <section aria-label="Target update" className={`flex items-start gap-3 rounded-lg border p-4 ${tone.box}`}>
          <svg aria-hidden="true" viewBox="0 0 24 24" className={`mt-0.5 size-5 shrink-0 ${tone.text}`} fill="currentColor">
            <path d="m3 17 6-6 4 4 8-8v5h2V4h-8v2h5l-7 7-4-4-7.4 7.4z" />
          </svg>
          <div className="space-y-1">
            <p className={`${label} ${tone.text}`}>{bannerLabel(banner.action)}</p>
            <p className="text-sm">{bannerText(banner, unit)}</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
