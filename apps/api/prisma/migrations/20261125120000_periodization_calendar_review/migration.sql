-- CreateEnum
CREATE TYPE "ScheduledStatus" AS ENUM ('PLANNED', 'COMPLETED', 'SKIPPED');

-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "shareTokenHash" TEXT;

-- AlterTable
ALTER TABLE "ProgramAssignment" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "Mesocycle" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "focus" TEXT,
    "startWeek" INTEGER NOT NULL,
    "endWeek" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "Mesocycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Microcycle" (
    "id" TEXT NOT NULL,
    "mesocycleId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startWeek" INTEGER NOT NULL,
    "endWeek" INTEGER NOT NULL,
    "isDeload" BOOLEAN NOT NULL DEFAULT false,
    "rpeMin" DECIMAL(3,1),
    "rpeMax" DECIMAL(3,1),
    "volumeDeltaPct" INTEGER,

    CONSTRAINT "Microcycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL,

    CONSTRAINT "SportCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramSportCategory" (
    "programId" TEXT NOT NULL,
    "sportCategoryId" TEXT NOT NULL,

    CONSTRAINT "ProgramSportCategory_pkey" PRIMARY KEY ("programId","sportCategoryId")
);

-- CreateTable
CREATE TABLE "ClientGroup" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientGroupMember" (
    "groupId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "ClientGroupMember_pkey" PRIMARY KEY ("groupId","clientId")
);

-- CreateTable
CREATE TABLE "ScheduledWorkout" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "ScheduledStatus" NOT NULL DEFAULT 'PLANNED',
    "movedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionFeedback" (
    "id" TEXT NOT NULL,
    "workoutLogId" TEXT NOT NULL,
    "exerciseLogId" TEXT,
    "setLogId" TEXT,
    "coachId" TEXT NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "carryForward" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mesocycle_programId_position_idx" ON "Mesocycle"("programId", "position");

-- CreateIndex
CREATE INDEX "Microcycle_mesocycleId_idx" ON "Microcycle"("mesocycleId");

-- CreateIndex
CREATE UNIQUE INDEX "SportCategory_name_key" ON "SportCategory"("name");

-- CreateIndex
CREATE INDEX "ProgramSportCategory_sportCategoryId_idx" ON "ProgramSportCategory"("sportCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientGroup_coachId_name_key" ON "ClientGroup"("coachId", "name");

-- CreateIndex
CREATE INDEX "ClientGroupMember_clientId_idx" ON "ClientGroupMember"("clientId");

-- CreateIndex
CREATE INDEX "ScheduledWorkout_clientId_date_idx" ON "ScheduledWorkout"("clientId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledWorkout_assignmentId_workoutId_key" ON "ScheduledWorkout"("assignmentId", "workoutId");

-- CreateIndex
CREATE INDEX "SessionFeedback_workoutLogId_idx" ON "SessionFeedback"("workoutLogId");

-- CreateIndex
CREATE INDEX "SessionFeedback_exerciseLogId_idx" ON "SessionFeedback"("exerciseLogId");

-- CreateIndex
CREATE UNIQUE INDEX "Program_shareTokenHash_key" ON "Program"("shareTokenHash");

-- CreateIndex
CREATE INDEX "ProgramAssignment_groupId_idx" ON "ProgramAssignment"("groupId");

-- AddForeignKey
ALTER TABLE "ProgramAssignment" ADD CONSTRAINT "ProgramAssignment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ClientGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mesocycle" ADD CONSTRAINT "Mesocycle_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Microcycle" ADD CONSTRAINT "Microcycle_mesocycleId_fkey" FOREIGN KEY ("mesocycleId") REFERENCES "Mesocycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramSportCategory" ADD CONSTRAINT "ProgramSportCategory_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramSportCategory" ADD CONSTRAINT "ProgramSportCategory_sportCategoryId_fkey" FOREIGN KEY ("sportCategoryId") REFERENCES "SportCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientGroup" ADD CONSTRAINT "ClientGroup_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientGroupMember" ADD CONSTRAINT "ClientGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ClientGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientGroupMember" ADD CONSTRAINT "ClientGroupMember_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledWorkout" ADD CONSTRAINT "ScheduledWorkout_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ProgramAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledWorkout" ADD CONSTRAINT "ScheduledWorkout_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledWorkout" ADD CONSTRAINT "ScheduledWorkout_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionFeedback" ADD CONSTRAINT "SessionFeedback_workoutLogId_fkey" FOREIGN KEY ("workoutLogId") REFERENCES "WorkoutLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionFeedback" ADD CONSTRAINT "SessionFeedback_exerciseLogId_fkey" FOREIGN KEY ("exerciseLogId") REFERENCES "ExerciseLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionFeedback" ADD CONSTRAINT "SessionFeedback_setLogId_fkey" FOREIGN KEY ("setLogId") REFERENCES "SetLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionFeedback" ADD CONSTRAINT "SessionFeedback_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Integrity checks.
ALTER TABLE "Mesocycle" ADD CONSTRAINT "Mesocycle_weeks_check" CHECK ("startWeek" >= 1 AND "endWeek" >= "startWeek" AND "endWeek" <= 52);
ALTER TABLE "Microcycle" ADD CONSTRAINT "Microcycle_weeks_check" CHECK ("startWeek" >= 1 AND "endWeek" >= "startWeek" AND "endWeek" <= 52);
ALTER TABLE "Microcycle" ADD CONSTRAINT "Microcycle_rpe_check" CHECK (("rpeMin" IS NULL OR "rpeMin" BETWEEN 1 AND 10) AND ("rpeMax" IS NULL OR "rpeMax" BETWEEN 1 AND 10) AND ("rpeMin" IS NULL OR "rpeMax" IS NULL OR "rpeMin" <= "rpeMax"));
ALTER TABLE "SessionFeedback" ADD CONSTRAINT "SessionFeedback_scope_check" CHECK ("setLogId" IS NULL OR "exerciseLogId" IS NOT NULL);

-- Sport catalog.
INSERT INTO "SportCategory" ("id", "name", "group") VALUES
  ('powerlifting', 'Powerlifting', 'Strength'),
  ('olympic-weightlifting', 'Olympic Weightlifting', 'Strength'),
  ('bodybuilding', 'Bodybuilding', 'Strength'),
  ('powerbuilding', 'Powerbuilding', 'Strength'),
  ('strongman', 'Strongman', 'Strength'),
  ('crossfit', 'CrossFit', 'Strength'),
  ('functional-fitness', 'Functional Fitness', 'Strength'),
  ('general-strength', 'General Strength', 'Strength'),
  ('hypertrophy', 'Hypertrophy', 'Strength'),
  ('calisthenics', 'Calisthenics', 'Strength'),
  ('kettlebell-sport', 'Kettlebell Sport', 'Strength'),
  ('american-football', 'American Football', 'Field'),
  ('rugby-union', 'Rugby Union', 'Field'),
  ('rugby-league', 'Rugby League', 'Field'),
  ('soccer', 'Soccer', 'Field'),
  ('baseball', 'Baseball', 'Field'),
  ('softball', 'Softball', 'Field'),
  ('lacrosse', 'Lacrosse', 'Field'),
  ('field-hockey', 'Field Hockey', 'Field'),
  ('cricket', 'Cricket', 'Field'),
  ('australian-rules-football', 'Australian Rules Football', 'Field'),
  ('ultimate-frisbee', 'Ultimate Frisbee', 'Field'),
  ('basketball', 'Basketball', 'Court'),
  ('volleyball', 'Volleyball', 'Court'),
  ('tennis', 'Tennis', 'Court'),
  ('badminton', 'Badminton', 'Court'),
  ('squash', 'Squash', 'Court'),
  ('pickleball', 'Pickleball', 'Court'),
  ('netball', 'Netball', 'Court'),
  ('handball', 'Handball', 'Court'),
  ('table-tennis', 'Table Tennis', 'Court'),
  ('boxing', 'Boxing', 'Combat'),
  ('muay-thai', 'Muay Thai', 'Combat'),
  ('brazilian-jiu-jitsu', 'Brazilian Jiu-Jitsu', 'Combat'),
  ('judo', 'Judo', 'Combat'),
  ('wrestling', 'Wrestling', 'Combat'),
  ('mixed-martial-arts', 'Mixed Martial Arts', 'Combat'),
  ('taekwondo', 'Taekwondo', 'Combat'),
  ('karate', 'Karate', 'Combat'),
  ('kickboxing', 'Kickboxing', 'Combat'),
  ('fencing', 'Fencing', 'Combat'),
  ('marathon', 'Marathon', 'Endurance'),
  ('half-marathon', 'Half Marathon', 'Endurance'),
  ('triathlon', 'Triathlon', 'Endurance'),
  ('cycling', 'Cycling', 'Endurance'),
  ('swimming', 'Swimming', 'Endurance'),
  ('rowing', 'Rowing', 'Endurance'),
  ('trail-running', 'Trail Running', 'Endurance'),
  ('ultra-running', 'Ultra Running', 'Endurance'),
  ('sprinting', 'Sprinting', 'Endurance'),
  ('middle-distance-running', 'Middle Distance Running', 'Endurance'),
  ('race-walking', 'Race Walking', 'Endurance'),
  ('shot-put', 'Shot Put', 'Track & Field'),
  ('discus', 'Discus', 'Track & Field'),
  ('javelin', 'Javelin', 'Track & Field'),
  ('hammer-throw', 'Hammer Throw', 'Track & Field'),
  ('high-jump', 'High Jump', 'Track & Field'),
  ('long-jump', 'Long Jump', 'Track & Field'),
  ('pole-vault', 'Pole Vault', 'Track & Field'),
  ('hurdles', 'Hurdles', 'Track & Field'),
  ('decathlon', 'Decathlon', 'Track & Field'),
  ('rock-climbing', 'Rock Climbing', 'Outdoor'),
  ('bouldering', 'Bouldering', 'Outdoor'),
  ('alpine-skiing', 'Alpine Skiing', 'Outdoor'),
  ('snowboarding', 'Snowboarding', 'Outdoor'),
  ('cross-country-skiing', 'Cross-Country Skiing', 'Outdoor'),
  ('surfing', 'Surfing', 'Outdoor'),
  ('mountaineering', 'Mountaineering', 'Outdoor'),
  ('obstacle-course-racing', 'Obstacle Course Racing', 'Outdoor'),
  ('golf', 'Golf', 'Other'),
  ('ice-hockey', 'Ice Hockey', 'Other'),
  ('gymnastics', 'Gymnastics', 'Other'),
  ('cheerleading', 'Cheerleading', 'Other'),
  ('dance', 'Dance', 'Other'),
  ('equestrian', 'Equestrian', 'Other'),
  ('skateboarding', 'Skateboarding', 'Other'),
  ('tactical-military', 'Tactical / Military', 'Other'),
  ('firefighter', 'Firefighter', 'Other'),
  ('rehabilitation', 'Rehabilitation', 'Other'),
  ('healthy-aging', 'Healthy Aging', 'Other'),
  ('general-fitness', 'General Fitness', 'Other')
ON CONFLICT ("id") DO NOTHING;

-- Backfill: one scheduled row per workout of every ACTIVE assignment, dated by the old formula
-- (start + (week - 1) * 7 + (day - 1)). A workout the client already logged against the assignment is COMPLETED.
INSERT INTO "ScheduledWorkout" ("id", "assignmentId", "workoutId", "clientId", "date", "status", "updatedAt")
SELECT gen_random_uuid()::text, a."id", w."id", a."clientId",
       (a."startDate" + ((w."weekNumber" - 1) * 7 + (w."dayNumber" - 1)))::date,
       CASE WHEN EXISTS (SELECT 1 FROM "WorkoutLog" l WHERE l."assignmentId" = a."id" AND l."workoutId" = w."id")
            THEN 'COMPLETED'::"ScheduledStatus" ELSE 'PLANNED'::"ScheduledStatus" END,
       CURRENT_TIMESTAMP
FROM "ProgramAssignment" a
JOIN "Workout" w ON w."programId" = a."programId"
WHERE a."status" = 'ACTIVE';
