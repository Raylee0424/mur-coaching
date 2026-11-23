import { Role } from '@coaching/shared';
import type { SavedNote } from '@/components/logger/ExerciseNotes';
import { WorkoutLogger } from '@/components/logger/WorkoutLogger';
import { exerciseNotesApi, exercisesApi, meApi, templatesApi, workoutLogsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { firstParam } from '@/lib/form';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Set-by-set logger. Started from Today it follows today's prescription; `?repeat=1` copies the last
 * session; `?template=<id>` starts from a saved template; with none of these it is a freeform session
 * where the athlete picks the exercises.
 */
export default async function LogPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser(Role.CLIENT);
  const params = await searchParams;
  const repeat = firstParam(params.repeat) === '1';
  const templateId = firstParam(params.template);

  const [exercises, today, latest, me, notes, templates, folders] = await Promise.all([
    exercisesApi.list(),
    meApi.today(),
    workoutLogsApi.listForClient(user.id, { limit: 1 }),
    meApi.profile(),
    exerciseNotesApi.list(),
    templatesApi.list(),
    templatesApi.listFolders(),
  ]);
  const savedNotes: Record<string, SavedNote[]> = {};
  for (const n of notes) (savedNotes[n.exerciseId] ??= []).push({ id: n.id, body: n.body });
  const template = templateId ? (templates.find((t) => t.id === templateId) ?? null) : null;
  const lastLog = latest.items[0] ?? null;
  const baselines = Object.fromEntries(
    me.baselines.flatMap((b) => (b.weightKg === null ? [] : [[b.exerciseId, { weightKg: b.weightKg, reps: b.reps }]])),
  );

  const mode = template ? 'template' : repeat && lastLog ? 'repeat' : today.state === 'READY' && today.workout ? 'today' : 'freeform';

  return (
    <WorkoutLogger
      // Repeat vs. normal start must not share state. Not keyed on `mode`: saving changes today's state
      // (the week completes), and the re-render that follows must not reset the "session complete" screen.
      key={template ? `template-${template.id}` : repeat ? 'repeat' : 'start'}
      mode={mode}
      today={today.workout}
      workoutName={
        mode === 'template'
          ? (template?.name ?? null)
          : mode === 'today'
            ? (today.workout?.name ?? null)
            : mode === 'repeat'
              ? 'Repeating your last session'
              : null
      }
      lastLog={lastLog}
      catalog={exercises}
      templates={templates}
      folders={folders}
      template={template}
      unit={user.weightUnit}
      baselines={baselines}
      savedNotes={savedNotes}
    />
  );
}
