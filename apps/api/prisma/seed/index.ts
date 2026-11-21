import { createHash } from 'node:crypto';
import { Prisma, PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { EXERCISES } from './exercises';
import {
  CLIENT_PLANS,
  EXTRA_CLIENTS,
  PROGRAM_NAME,
  PROGRAM_WEEKS,
  TEMPLATE_DAYS,
  TEMPLATE_NAME,
  TEMPLATE_WEEKS,
  WORKOUT_TEMPLATE,
  buildSets,
  type ClientPlan,
  type ExtraClientSeed,
  type WorkoutSeed,
} from './demo-history';
import { evaluate, resolveEngineSettings, shouldAutoApprove } from '../../src/modules/progression/engine';
import type { SessionInput } from '../../src/modules/progression/engine';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'demo-password-123';
const COACH_EMAIL = 'demo.coach@coaching.demo';
const DAY_MS = 24 * 60 * 60 * 1000;
/** The program runs longer than the four weeks of canned history, so "this week" is still ahead. */
const PROGRAM_DURATION_WEEKS = 6;
const DEMO_INVITE_TOKEN = 'demo-invite-token-morgan-0001';
const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000';

/** Monday (UTC midnight) of the week that started PROGRAM_WEEKS weeks before this week. */
function programStartDate(now: Date): Date {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const sinceMonday = (new Date(today).getUTCDay() + 6) % 7;
  return new Date(today - sinceMonday * DAY_MS - PROGRAM_WEEKS * 7 * DAY_MS);
}

/** Remove demo data only. FK order matters: ProgramAssignment → Program is RESTRICT. */
async function wipeDemoData(): Promise<void> {
  await prisma.$transaction([
    prisma.progressionRecommendation.deleteMany({ where: { client: { isDemo: true } } }),
    prisma.workoutLog.deleteMany({ where: { client: { isDemo: true } } }),
    prisma.programAssignment.deleteMany({ where: { client: { isDemo: true } } }),
    prisma.program.deleteMany({ where: { coach: { isDemo: true } } }),
    prisma.exercise.deleteMany({ where: { coach: { isDemo: true } } }),
    prisma.coachClient.deleteMany({ where: { coach: { isDemo: true } } }),
    prisma.user.deleteMany({ where: { isDemo: true } }),
  ]);
}

/** Global exercises are kept across reseeds (other rows may reference them). */
async function upsertGlobalExercises(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const ex of EXERCISES) {
    const existing = await prisma.exercise.findFirst({ where: { coachId: null, name: ex.name } });
    const data = {
      muscleGroup: ex.muscleGroup,
      equipment: ex.equipment,
      loadIncrementKg: ex.loadIncrementKg,
    };
    const row = existing
      ? await prisma.exercise.update({ where: { id: existing.id }, data })
      : await prisma.exercise.create({ data: { name: ex.name, coachId: null, ...data } });
    ids.set(ex.name, row.id);
  }
  return ids;
}

async function createWorkouts(
  programId: string,
  weeks: number,
  days: readonly WorkoutSeed[],
  exerciseId: (name: string) => string,
  workoutIds: Map<string, string>,
  workoutExerciseIds: Map<string, string>,
): Promise<void> {
  for (let week = 1; week <= weeks; week++) {
    for (const day of days) {
      const workout = await prisma.workout.create({
        data: { programId, weekNumber: week, dayNumber: day.dayNumber, name: day.name },
      });
      workoutIds.set(`${week}:${day.dayNumber}`, workout.id);
      for (const [i, rx] of day.exercises.entries()) {
        const we = await prisma.workoutExercise.create({
          data: {
            workoutId: workout.id,
            exerciseId: exerciseId(rx.exercise),
            order: i + 1,
            targetSets: rx.sets,
            targetRepsMin: rx.repsMin,
            targetRepsMax: rx.repsMax,
            targetRpe: rx.rpe,
            restSeconds: rx.restSeconds,
          },
        });
        workoutExerciseIds.set(`${week}:${day.dayNumber}:${rx.exercise}`, we.id);
      }
    }
  }
}

/** Mirrors ProgressionService.refreshExercise for every lift the client has >= 2 sessions of. */
async function seedRecommendations(c: {
  clientId: string;
  autoApprove: boolean;
  autoApproveMaxKg: number | null;
  overrides: ExtraClientSeed['overrides'];
}): Promise<void> {
  const grouped = await prisma.exerciseLog.groupBy({
    by: ['exerciseId'],
    where: { workoutLog: { clientId: c.clientId } },
    having: { exerciseId: { _count: { gte: 2 } } },
  });
  for (const { exerciseId } of grouped) {
    const logs = await prisma.exerciseLog.findMany({
      where: { exerciseId, workoutLog: { clientId: c.clientId } },
      orderBy: { workoutLog: { performedAt: 'desc' } },
      take: 3,
      include: { sets: true, workoutLog: true, workoutExercise: true, exercise: true },
    });
    const target = logs.find((l) => l.workoutExercise)?.workoutExercise;
    const latest = logs[0];
    if (!target || !latest) continue;

    const history: SessionInput[] = logs.map((l) => ({
      exerciseLogId: l.id,
      performedAt: l.workoutLog.performedAt,
      sets: l.sets.map((s) => ({ reps: s.reps, weightKg: s.weightKg.toNumber(), rpe: s.rpe?.toNumber() ?? null, isWarmup: s.isWarmup })),
    }));
    const settings = resolveEngineSettings({
      coach: null,
      client: c.overrides ? { loadIncrementKg: c.overrides.loadIncrementKg ?? null, rpeCap: c.overrides.rpeCap ?? null } : null,
      exercise: { rpeCap: latest.exercise.rpeCap?.toNumber() ?? null, repsMin: latest.exercise.repsMin, repsMax: latest.exercise.repsMax },
      prescription: {
        targetSets: target.targetSets,
        repsMin: target.targetRepsMin,
        repsMax: target.targetRepsMax,
        targetRpe: target.targetRpe?.toNumber() ?? null,
        loadIncrementKg: latest.exercise.loadIncrementKg.toNumber(),
      },
    });
    const draft = evaluate(history, settings.rx, settings.thresholds);
    if (!draft || draft.metrics.length < 2) continue;

    const auto = shouldAutoApprove(draft, { autoApprove: c.autoApprove, autoApproveMaxKg: c.autoApproveMaxKg });
    await prisma.progressionRecommendation.create({
      data: {
        clientId: c.clientId,
        exerciseId,
        action: draft.action,
        ...(auto ? { status: 'ACCEPTED', resolvedAt: new Date(), autoApproved: true } : {}),
        recommendedWeightKg: draft.recommendedWeightKg,
        recommendedRepsMin: draft.recommendedRepsMin,
        recommendedRepsMax: draft.recommendedRepsMax,
        recommendedSets: draft.recommendedSets,
        reason: draft.reason,
        metrics: draft.metrics as unknown as Prisma.InputJsonValue,
        sourceExerciseLogIds: draft.sourceExerciseLogIds,
        settings: settings.resolved as unknown as Prisma.InputJsonValue,
      },
    });
  }
}

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const startDate = programStartDate(new Date());

  await wipeDemoData();
  const exerciseIds = await upsertGlobalExercises();
  const exerciseId = (name: string): string => {
    const id = exerciseIds.get(name);
    if (!id) throw new Error(`Unknown exercise: ${name}`);
    return id;
  };

  const coach = await prisma.user.create({
    data: {
      email: COACH_EMAIL,
      name: 'Morgan Reyes (Demo Coach)',
      displayName: 'Coach Morgan',
      role: Role.COACH,
      isDemo: true,
      onboardedAt: new Date(),
      emailVerifiedAt: new Date(),
      passwordHash,
    },
  });

  const program = await prisma.program.create({
    data: {
      coachId: coach.id,
      name: PROGRAM_NAME,
      description: '6-week upper/lower split, 4 days per week, double progression.',
      durationWeeks: PROGRAM_DURATION_WEEKS,
    },
  });

  // Template: weeks × days. Keep the created WorkoutExercise ids to link logs to prescriptions.
  const workoutExerciseIds = new Map<string, string>(); // `${week}:${day}:${exercise}` → id
  const workoutIds = new Map<string, string>(); // `${week}:${day}` → id
  await createWorkouts(program.id, PROGRAM_DURATION_WEEKS, WORKOUT_TEMPLATE, exerciseId, workoutIds, workoutExerciseIds);

  // Not assigned to anyone: shows up under "Templates".
  const template = await prisma.program.create({
    data: {
      coachId: coach.id,
      name: TEMPLATE_NAME,
      description: 'Three full-body days. A starting point for newer lifters.',
      durationWeeks: TEMPLATE_WEEKS,
      isTemplate: true,
    },
  });
  await createWorkouts(template.id, TEMPLATE_WEEKS, TEMPLATE_DAYS, exerciseId, new Map(), new Map());

  // Coach-owned exercises with exercise-level engine rules (rpeCap + rep range).
  await prisma.exercise.createMany({
    data: [
      { coachId: coach.id, name: 'Pause Bench Press', muscleGroup: 'CHEST', equipment: 'Barbell', loadIncrementKg: 2.5, rpeCap: 8.5, repsMin: 3, repsMax: 5 },
      { coachId: coach.id, name: 'Tempo Back Squat', muscleGroup: 'QUADS', equipment: 'Barbell', loadIncrementKg: 5, rpeCap: 8, repsMin: 4, repsMax: 6 },
      { coachId: coach.id, name: 'Cable Fly', muscleGroup: 'CHEST', equipment: 'Cable', loadIncrementKg: 2.5 },
    ],
  });

  const now = new Date();
  const seeded: { clientId: string; autoApprove: boolean; autoApproveMaxKg: number | null; overrides: ExtraClientSeed['overrides'] }[] = [];

  const seedClient = async (
    plan: ClientPlan,
    opts: { status: 'ACTIVE' | 'PAUSED'; lastLoggedWeek: number; skips?: ExtraClientSeed['skips']; autoApprove?: { maxKg: number }; overrides?: ExtraClientSeed['overrides'] },
  ): Promise<void> => {
    const client = await prisma.user.create({
      data: {
        email: plan.email,
        name: plan.name,
        role: Role.CLIENT,
        isDemo: true,
        onboardedAt: new Date(),
        emailVerifiedAt: new Date(),
        passwordHash,
        clientProfile: { create: plan.profile },
      },
    });
    await prisma.coachClient.create({
      data: {
        coachId: coach.id,
        clientId: client.id,
        status: opts.status,
        ...(opts.autoApprove ? { autoApprove: true, autoApproveMaxKg: opts.autoApprove.maxKg } : {}),
        ...(opts.overrides?.loadIncrementKg ? { loadIncrementKg: opts.overrides.loadIncrementKg } : {}),
        ...(opts.overrides?.rpeCap ? { rpeCap: opts.overrides.rpeCap } : {}),
      },
    });
    const assignment = await prisma.programAssignment.create({
      data: { programId: program.id, clientId: client.id, startDate },
    });
    seeded.push({ clientId: client.id, autoApprove: !!opts.autoApprove, autoApproveMaxKg: opts.autoApprove?.maxKg ?? null, overrides: opts.overrides });

    for (let week = 1; week <= opts.lastLoggedWeek; week++) {
      for (const day of WORKOUT_TEMPLATE) {
        if (opts.skips?.(week, day.dayNumber)) continue;
        const performedAt = new Date(startDate.getTime() + ((week - 1) * 7 + (day.dayNumber - 1)) * DAY_MS);
        performedAt.setUTCHours(17, 30, 0, 0);
        if (performedAt > now) continue; // never log the future
        // Only four weeks of canned history exist: later weeks repeat the last one.
        const historyWeek = Math.min(week - 1, 3);

        await prisma.workoutLog.create({
          data: {
            clientId: client.id,
            assignmentId: assignment.id,
            workoutId: workoutIds.get(`${week}:${day.dayNumber}`) ?? null,
            performedAt,
            notes: week === 4 && day.dayNumber === 1 ? 'Bench felt heavy today, left shoulder a bit tight.' : null,
            exerciseLogs: {
              create: day.exercises.map((rx, i) => {
                const lift = plan.history[rx.exercise];
                if (!lift) throw new Error(`${plan.name}: no history for ${rx.exercise}`);
                return {
                  exerciseId: exerciseId(rx.exercise),
                  workoutExerciseId: workoutExerciseIds.get(`${week}:${day.dayNumber}:${rx.exercise}`) ?? null,
                  order: i + 1,
                  sets: { create: buildSets(rx, lift, historyWeek) },
                };
              }),
            },
          },
        });
      }
    }
  };

  // Alex leaves the last session of the current week unlogged so the client "Today" screen has a workout.
  for (const [i, plan] of CLIENT_PLANS.entries()) {
    await seedClient(plan, { status: 'ACTIVE', lastLoggedWeek: 5, ...(i === 0 ? { skips: (week, day) => week === 5 && day === 5 } : {}) });
  }
  for (const extra of EXTRA_CLIENTS) await seedClient(extra.plan, extra);

  // Engine calls from the logs actually written (same pure functions the API uses).
  for (const c of seeded) await seedRecommendations(c);

  // One coach override with a note: Alex's squat call is softened and accepted.
  const alex = await prisma.user.findFirstOrThrow({ where: { email: CLIENT_PLANS[0]?.email } });
  const squatRec = await prisma.progressionRecommendation.findFirst({
    where: { clientId: alex.id, exerciseId: exerciseId('Back Squat'), status: 'PENDING' },
  });
  if (squatRec) {
    const proposed = squatRec.recommendedWeightKg?.toNumber() ?? 100;
    await prisma.progressionRecommendation.update({
      where: { id: squatRec.id },
      data: {
        status: 'ACCEPTED',
        resolvedAt: now,
        overrideWeightKg: Math.max(0, proposed - 2.5),
        overrideRepsMin: squatRec.recommendedRepsMin ?? 5,
        overrideRepsMax: squatRec.recommendedRepsMax ?? 7,
        overrideRpe: 8,
        overrideNote: 'Keep it conservative this week: your knees were sore after Thursday. Add the weight next time.',
        overriddenById: coach.id,
        overriddenAt: now,
      },
    });
  }

  // A pending invite (coach onboarding / invite modal). Token is fixed so the link is copyable from the console.
  await prisma.invite.create({
    data: {
      coachId: coach.id,
      name: 'Sam Rivera',
      email: 'demo.sam@coaching.demo',
      phone: '+1 555 0100',
      programId: template.id,
      startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 7)),
      tokenHash: createHash('sha256').update(DEMO_INVITE_TOKEN).digest('hex'),
      expiresAt: new Date(now.getTime() + 7 * DAY_MS),
    },
  });
  console.log(`Demo invite link: ${WEB_URL}/invite/${DEMO_INVITE_TOKEN}`);

  const [users, exercises, workouts, logs, exerciseLogs, setLogs] = await Promise.all([
    prisma.user.count({ where: { isDemo: true } }),
    prisma.exercise.count({ where: { coachId: null } }),
    prisma.workout.count(),
    prisma.workoutLog.count(),
    prisma.exerciseLog.count(),
    prisma.setLog.count(),
  ]);
  console.log({ users, globalExercises: exercises, workouts, workoutLogs: logs, exerciseLogs, setLogs });
  console.log(`Demo password for all demo users: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
