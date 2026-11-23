-- Phase 1B: structured exercise library (equipment, muscles, profile, position, pattern, athlete owner)
-- and joint / movement-pattern limitation targets.

-- CreateEnum
CREATE TYPE "Equipment" AS ENUM ('BARBELL', 'DUMBBELL', 'CABLE', 'MACHINE', 'SMITH_MACHINE', 'BODYWEIGHT', 'KETTLEBELL', 'BAND', 'SPECIALTY_BAR', 'OTHER');
CREATE TYPE "MuscleRole" AS ENUM ('PRIMARY', 'SECONDARY');
CREATE TYPE "ResistanceProfile" AS ENUM ('LENGTHENED', 'MID_RANGE', 'SHORTENED');
CREATE TYPE "ExercisePosition" AS ENUM ('STANDING', 'SEATED', 'SUPPORTED', 'LYING');
CREATE TYPE "MovementPattern" AS ENUM ('SQUAT', 'HINGE', 'LUNGE', 'HORIZONTAL_PUSH', 'VERTICAL_PUSH', 'HORIZONTAL_PULL', 'VERTICAL_PULL', 'CARRY', 'CORE', 'ARM_ISOLATION', 'LEG_ISOLATION');
CREATE TYPE "Joint" AS ENUM ('NECK', 'SHOULDER', 'ELBOW', 'WRIST', 'LOWER_BACK', 'HIP', 'KNEE', 'ANKLE');

-- AlterEnum. The new values cannot be referenced as enum literals in this transaction,
-- so the CHECK below compares "target"::text.
ALTER TYPE "LimitationTarget" ADD VALUE 'JOINT';
ALTER TYPE "LimitationTarget" ADD VALUE 'PATTERN';

-- Exercise: new columns. Free-text equipment is converted, then the old column is dropped.
ALTER TABLE "Exercise"
  ADD COLUMN "ownerId" TEXT,
  ADD COLUMN "pattern" "MovementPattern",
  ADD COLUMN "position" "ExercisePosition",
  ADD COLUMN "profile" "ResistanceProfile",
  ADD COLUMN "equipment_new" "Equipment";

UPDATE "Exercise" SET "equipment_new" = (
  CASE
    WHEN "equipment" IS NULL OR btrim("equipment") = '' THEN NULL
    WHEN lower(btrim("equipment")) IN ('barbell', 'bar', 'ez bar', 'ez-bar', 'trap bar') THEN 'BARBELL'
    WHEN lower(btrim("equipment")) IN ('dumbbell', 'dumbbells', 'db') THEN 'DUMBBELL'
    WHEN lower(btrim("equipment")) IN ('cable', 'cables', 'cable machine') THEN 'CABLE'
    WHEN lower(btrim("equipment")) IN ('machine', 'plate-loaded', 'plate loaded', 'machine / plate-loaded', 'selectorized') THEN 'MACHINE'
    WHEN lower(btrim("equipment")) IN ('smith', 'smith machine') THEN 'SMITH_MACHINE'
    WHEN lower(btrim("equipment")) IN ('bodyweight', 'body weight', 'none') THEN 'BODYWEIGHT'
    WHEN lower(btrim("equipment")) IN ('kettlebell', 'kettlebells', 'kb') THEN 'KETTLEBELL'
    WHEN lower(btrim("equipment")) IN ('band', 'bands', 'resistance band') THEN 'BAND'
    WHEN lower(btrim("equipment")) IN ('specialty bar', 'safety squat bar', 'cambered bar', 'ssb') THEN 'SPECIALTY_BAR'
    ELSE 'OTHER'
  END
)::"Equipment";

ALTER TABLE "Exercise" DROP COLUMN "equipment";
ALTER TABLE "Exercise" RENAME COLUMN "equipment_new" TO "equipment";

-- An exercise is global, coach-owned or athlete-owned, never coach and athlete at once.
ALTER TABLE "Exercise"
  ADD CONSTRAINT "Exercise_owner_check" CHECK ("coachId" IS NULL OR "ownerId" IS NULL);

CREATE UNIQUE INDEX "Exercise_ownerId_name_key" ON "Exercise"("ownerId", "name");

ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ExerciseMuscle
CREATE TABLE "ExerciseMuscle" (
    "exerciseId" TEXT NOT NULL,
    "muscle" "MuscleGroup" NOT NULL,
    "role" "MuscleRole" NOT NULL,

    CONSTRAINT "ExerciseMuscle_pkey" PRIMARY KEY ("exerciseId","muscle")
);

CREATE INDEX "ExerciseMuscle_muscle_idx" ON "ExerciseMuscle"("muscle");

ALTER TABLE "ExerciseMuscle" ADD CONSTRAINT "ExerciseMuscle_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every existing exercise trains its muscleGroup as PRIMARY.
INSERT INTO "ExerciseMuscle" ("exerciseId", "muscle", "role")
SELECT "id", "muscleGroup", 'PRIMARY' FROM "Exercise";

-- Limitation: joint and movement-pattern targets.
ALTER TABLE "Limitation"
  ADD COLUMN "joint" "Joint",
  ADD COLUMN "pattern" "MovementPattern";

ALTER TABLE "Limitation" DROP CONSTRAINT "Limitation_target_check";
ALTER TABLE "Limitation"
  ADD CONSTRAINT "Limitation_target_check" CHECK (
    ("target"::text = 'MUSCLE' AND "muscleGroup" IS NOT NULL AND "exerciseId" IS NULL AND "joint" IS NULL AND "pattern" IS NULL)
    OR ("target"::text = 'EXERCISE' AND "exerciseId" IS NOT NULL AND "muscleGroup" IS NULL AND "joint" IS NULL AND "pattern" IS NULL)
    OR ("target"::text = 'JOINT' AND "joint" IS NOT NULL AND "muscleGroup" IS NULL AND "exerciseId" IS NULL AND "pattern" IS NULL)
    OR ("target"::text = 'PATTERN' AND "pattern" IS NOT NULL AND "muscleGroup" IS NULL AND "exerciseId" IS NULL AND "joint" IS NULL)
  );
