import { Role } from '@coaching/shared';
import { WorkoutLogger } from '@/components/logger/WorkoutLogger';
import { exerciseNotesApi, exercisesApi, meApi, workoutLogsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { firstParam } from '@/lib/form';
import { toNumber } from '@/lib/format';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Set-by-set logger. Started from Today it follows today's prescription; `?repeat=1` copies the last
 * session; with neither it is a freeform session where the athlete picks the exercises.
 */
export default async function LogPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser(Role.CLIENT);
  const params = await searchParams;
  const repeat = firstParam(params.repeat) === '1';

  const [exercises, today, latest, me, notes] = await Promise.all([
    exercisesApi.list(),
    meApi.today(),
    workoutLogsApi.listForClient(user.id, { limit: 1 }),
    meApi.profile(),
    exerciseNotesApi.list(),
  ]);
  const savedNotes: Record<string, string[]> = {};
  for (const n of notes) (savedNotes[n.exerciseId] ??= []).push(n.body);
  const lastLog = latest.items[0] ?? null;
  const baselines = Object.fromEntries(
    me.baselines.flatMap((b) => (b.weightKg === null ? [] : [[b.exerciseId, { weightKg: b.weightKg, reps: b.reps }]])),
  );

  const mode = repeat && lastLog ? 'repeat' : today.state === 'READY' && today.workout ? 'today' : 'freeform';

  return (
    <WorkoutLogger
      // Repeat vs. normal start must not share state. Not keyed on `mode`: saving changes today's state
      // (the week completes), and the re-render that follows must not reset the "session complete" screen.
      key={repeat ? 'repeat' : 'start'}
      mode={mode}
      today={today.workout}
      workoutName={mode === 'today' ? today.workout?.name ?? null : mode === 'repeat' ? 'Repeating your last session' : null}
      lastLog={lastLog}
      library={exercises.map((e) => ({ id: e.id, name: e.name, muscleGroup: e.muscleGroup, loadIncrementKg: toNumber(e.loadIncrementKg) }))}
      unit={user.weightUnit}
      baselines={baselines}
      savedNotes={savedNotes}
    />
  );
}
