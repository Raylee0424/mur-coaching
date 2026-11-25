-- CreateEnum
CREATE TYPE "HealthSource" AS ENUM ('MANUAL', 'APPLE_HEALTH', 'HEALTH_CONNECT', 'CSV');

-- CreateEnum
CREATE TYPE "ImportSource" AS ENUM ('STRONG', 'HEVY', 'MYFITNESSPAL', 'MACROFACTOR');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('COMPLETED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "SharedWorkoutKind" AS ENUM ('SESSION', 'TEMPLATE');

-- CreateEnum
CREATE TYPE "ReportTarget" AS ENUM ('USER', 'GROUP', 'SHARED_WORKOUT');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWED');

-- CreateTable
CREATE TABLE "DailyHealthMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "source" "HealthSource" NOT NULL,
    "steps" INTEGER,
    "sleepMinutes" INTEGER,
    "hrvMs" INTEGER,
    "restingHr" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyHealthMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepGoal" (
    "userId" TEXT NOT NULL,
    "dailySteps" INTEGER NOT NULL DEFAULT 10000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StepGoal_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "ImportSource" NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'COMPLETED',
    "fileName" VARCHAR(160),
    "fileHash" CHAR(64) NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "createdCount" INTEGER NOT NULL,
    "duplicateCount" INTEGER NOT NULL,
    "skippedCount" INTEGER NOT NULL,
    "createdIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rolledBackAt" TIMESTAMP(3),

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRecord" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "ImportSource" NOT NULL,
    "hash" CHAR(64) NOT NULL,
    "targetId" TEXT NOT NULL,

    CONSTRAINT "ImportRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseAlias" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "ImportSource" NOT NULL,
    "sourceName" VARCHAR(120) NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "addresseeId" TEXT NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingGroup" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "description" VARCHAR(280),
    "inviteCode" VARCHAR(12) NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingGroupMember" (
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "shareStats" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingGroupMember_pkey" PRIMARY KEY ("groupId","userId")
);

-- CreateTable
CREATE TABLE "SharedWorkout" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "SharedWorkoutKind" NOT NULL,
    "workoutLogId" TEXT,
    "templateId" TEXT,
    "caption" VARCHAR(280),
    "summary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBlock" (
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("blockerId","blockedId")
);

-- CreateTable
CREATE TABLE "ContentReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "ReportTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" VARCHAR(40) NOT NULL,
    "details" VARCHAR(500),
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyHealthMetric_userId_date_idx" ON "DailyHealthMetric"("userId", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "DailyHealthMetric_userId_date_source_key" ON "DailyHealthMetric"("userId", "date", "source");

-- CreateIndex
CREATE INDEX "ImportJob_userId_createdAt_idx" ON "ImportJob"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ImportJob_userId_source_fileHash_idx" ON "ImportJob"("userId", "source", "fileHash");

-- CreateIndex
CREATE INDEX "ImportRecord_jobId_idx" ON "ImportRecord"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportRecord_userId_source_hash_key" ON "ImportRecord"("userId", "source", "hash");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseAlias_userId_source_sourceName_key" ON "ExerciseAlias"("userId", "source", "sourceName");

-- CreateIndex
CREATE INDEX "Friendship_addresseeId_status_idx" ON "Friendship"("addresseeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_requesterId_addresseeId_key" ON "Friendship"("requesterId", "addresseeId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingGroup_inviteCode_key" ON "TrainingGroup"("inviteCode");

-- CreateIndex
CREATE INDEX "TrainingGroup_isPrivate_createdAt_idx" ON "TrainingGroup"("isPrivate", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "TrainingGroupMember_userId_idx" ON "TrainingGroupMember"("userId");

-- CreateIndex
CREATE INDEX "SharedWorkout_groupId_createdAt_idx" ON "SharedWorkout"("groupId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "UserBlock_blockedId_idx" ON "UserBlock"("blockedId");

-- CreateIndex
CREATE INDEX "ContentReport_status_createdAt_idx" ON "ContentReport"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "DailyHealthMetric" ADD CONSTRAINT "DailyHealthMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepGoal" ADD CONSTRAINT "StepGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRecord" ADD CONSTRAINT "ImportRecord_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseAlias" ADD CONSTRAINT "ExerciseAlias_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseAlias" ADD CONSTRAINT "ExerciseAlias_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingGroupMember" ADD CONSTRAINT "TrainingGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TrainingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingGroupMember" ADD CONSTRAINT "TrainingGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedWorkout" ADD CONSTRAINT "SharedWorkout_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TrainingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedWorkout" ADD CONSTRAINT "SharedWorkout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Additive only. Rollback: DROP TABLE "ContentReport", "UserBlock", "SharedWorkout", "TrainingGroupMember", "TrainingGroup",
-- "Friendship", "ExerciseAlias", "ImportRecord", "ImportJob", "StepGoal", "DailyHealthMetric";
-- then DROP TYPE "ReportStatus", "ReportTarget", "SharedWorkoutKind", "GroupRole", "FriendshipStatus", "ImportStatus",
-- "ImportSource", "HealthSource". Rolling back deletes imported-job history but never the imported logs themselves.
ALTER TABLE "DailyHealthMetric" ADD CONSTRAINT "DailyHealthMetric_ranges_check" CHECK (
  ("steps" IS NULL OR "steps" BETWEEN 0 AND 200000)
  AND ("sleepMinutes" IS NULL OR "sleepMinutes" BETWEEN 0 AND 1440)
  AND ("hrvMs" IS NULL OR "hrvMs" BETWEEN 1 AND 300)
  AND ("restingHr" IS NULL OR "restingHr" BETWEEN 20 AND 250)
);
ALTER TABLE "StepGoal" ADD CONSTRAINT "StepGoal_dailySteps_check" CHECK ("dailySteps" BETWEEN 1000 AND 100000);
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_counts_check" CHECK ("rowCount" >= 0 AND "createdCount" >= 0 AND "duplicateCount" >= 0 AND "skippedCount" >= 0);
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_hash_check" CHECK ("fileHash" ~ '^[0-9a-f]{64}$');
ALTER TABLE "ImportRecord" ADD CONSTRAINT "ImportRecord_hash_check" CHECK ("hash" ~ '^[0-9a-f]{64}$');
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_not_self_check" CHECK ("requesterId" <> "addresseeId");
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_not_self_check" CHECK ("blockerId" <> "blockedId");
ALTER TABLE "SharedWorkout" ADD CONSTRAINT "SharedWorkout_source_check" CHECK (
  ("kind" = 'SESSION' AND "workoutLogId" IS NOT NULL) OR ("kind" = 'TEMPLATE' AND "templateId" IS NOT NULL)
);
