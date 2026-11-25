import { Feature, Role } from '@coaching/shared';
import type { SavedNote } from '@/components/logger/ExerciseNotes';
import { WorkoutLogger } from '@/components/logger/WorkoutLogger';
import { billingApi, exerciseNotesApi, exercisesApi, meApi, templatesApi, workoutLogsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { firstParam } from '@/lib/form';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Set-by-set logger. Started from Today it follows today's prescription; `?repeat=1` copies the last
 * session and `?repeat=<logId>` a chosen one (History); `?template=<id>` starts from a saved template; with none of these it is a freeform session
 * where the athlete picks the exercises.
 */
export default async function LogPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser(Role.CLIENT);
  const params = await searchParams;
  const repeatParam = firstParam(params.repeat);
  const repeat = repeatParam !== undefined && repeatParam !== '';
  const repeatId = repeat && repeatParam !== '1' ? repeatParam : null;
  const templateId = firstParam(params.template);

  const [exercises, today, latest, chosen, me, notes, templates, folders, entitlements] = await Promise.all([
    exercisesApi.list(),
    meApi.today(),
    workoutLogsApi.listForClient(user.id, { limit: 1 }),
    // The API answers 403/404 for a log that is not the athlete's; fall back to the last session.
    repeatId ? workoutLogsApi.get(repeatId).catch(() => null) : Promise.resolve(null),
    meApi.profile(),
    exerciseNotesApi.list(),
    templatesApi.list(),
    templatesApi.listFolders(),
    billingApi.entitlements(),
  ]);
  const savedNotes: Record<string, SavedNote[]> = {};
  for (const n of notes) (savedNotes[n.exerciseId] ??= []).push({ id: n.id, body: n.body });
  const template = templateId ? (templates.find((t) => t.id === templateId) ?? null) : null;
  const lastLog = (chosen && chosen.clientId === user.id ? chosen : null) ?? latest.items[0] ?? null;
  const repeatingChosen = lastLog !== null && lastLog.id === chosen?.id && lastLog.id !== latest.items[0]?.id;
  const baselines = Object.fromEntries(
    me.baselines.flatMap((b) => (b.weightKg === null ? [] : [[b.exerciseId, { weightKg: b.weightKg, reps: b.reps }]])),
  );

  const mode = template ? 'template' : repeat && lastLog ? 'repeat' : today.state === 'READY' && today.workout ? 'today' : 'freeform';

  return (
    <WorkoutLogger
      // Repeat vs. normal start must not share state. Not keyed on `mode`: saving changes today's state
      // (the week completes), and the re-render that follows must not reset the "session complete" screen.
      key={template ? `template-${template.id}` : repeat ? `repeat-${repeatId ?? 'last'}` : 'start'}
      mode={mode}
      today={today.workout}
      workoutName={
        mode === 'template'
          ? (template?.name ?? null)
          : mode === 'today'
            ? (today.workout?.name ?? null)
            : mode === 'repeat'
              ? repeatingChosen
                ? `Repeating ${lastLog.workout?.name ?? 'a past session'}`
                : 'Repeating your last session'
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
      voiceEnabled={entitlements.features.includes(Feature.VOICE_LOGGING)}
    />
  );
}
