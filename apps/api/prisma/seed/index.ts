import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { EXERCISES } from './exercises';
import {
  CLIENT_PLANS,
  PROGRAM_NAME,
  PROGRAM_WEEKS,
  WORKOUT_TEMPLATE,
  buildSets,
} from './demo-history';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'demo-password-123';
const COACH_EMAIL = 'demo.coach@coaching.demo';
const DAY_MS = 24 * 60 * 60 * 1000;

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
    data: { email: COACH_EMAIL, name: 'Morgan Reyes (Demo Coach)', role: Role.COACH, isDemo: true, passwordHash },
  });

  const program = await prisma.program.create({
    data: {
      coachId: coach.id,
      name: PROGRAM_NAME,
      description: '4-week upper/lower split, 4 days per week, double progression.',
      durationWeeks: PROGRAM_WEEKS,
    },
  });

  // Template: weeks × days. Keep the created WorkoutExercise ids to link logs to prescriptions.
  const workoutExerciseIds = new Map<string, string>(); // `${week}:${day}:${exercise}` → id
  const workoutIds = new Map<string, string>(); // `${week}:${day}` → id
  for (let week = 1; week <= PROGRAM_WEEKS; week++) {
    for (const day of WORKOUT_TEMPLATE) {
      const workout = await prisma.workout.create({
        data: { programId: program.id, weekNumber: week, dayNumber: day.dayNumber, name: day.name },
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

  for (const plan of CLIENT_PLANS) {
    const client = await prisma.user.create({
      data: { email: plan.email, name: plan.name, role: Role.CLIENT, isDemo: true, passwordHash },
    });
    await prisma.coachClient.create({ data: { coachId: coach.id, clientId: client.id } });
    const assignment = await prisma.programAssignment.create({
      data: { programId: program.id, clientId: client.id, startDate },
    });

    for (let week = 1; week <= PROGRAM_WEEKS; week++) {
      for (const day of WORKOUT_TEMPLATE) {
        const performedAt = new Date(startDate.getTime() + ((week - 1) * 7 + (day.dayNumber - 1)) * DAY_MS);
        performedAt.setUTCHours(17, 30, 0, 0);

        await prisma.workoutLog.create({
          data: {
            clientId: client.id,
            assignmentId: assignment.id,
            workoutId: workoutIds.get(`${week}:${day.dayNumber}`) ?? null,
            performedAt,
            exerciseLogs: {
              create: day.exercises.map((rx, i) => {
                const lift = plan.history[rx.exercise];
                if (!lift) throw new Error(`${plan.name}: no history for ${rx.exercise}`);
                return {
                  exerciseId: exerciseId(rx.exercise),
                  workoutExerciseId: workoutExerciseIds.get(`${week}:${day.dayNumber}:${rx.exercise}`) ?? null,
                  order: i + 1,
                  sets: { create: buildSets(rx, lift, week - 1) },
                };
              }),
            },
          },
        });
      }
    }
  }

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
