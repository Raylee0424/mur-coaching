-- CreateEnum
CREATE TYPE "WeightUnit" AS ENUM ('KG', 'LB');

-- CreateEnum
CREATE TYPE "Experience" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- AlterEnum
ALTER TYPE "CoachClientStatus" ADD VALUE 'PAUSED';

-- AlterTable
ALTER TABLE "CoachClient" ADD COLUMN     "autoApprove" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoApproveMaxKg" DECIMAL(5,2),
ADD COLUMN     "deloadPercent" INTEGER,
ADD COLUMN     "loadIncrementKg" DECIMAL(5,2),
ADD COLUMN     "repsMax" INTEGER,
ADD COLUMN     "repsMin" INTEGER,
ADD COLUMN     "rpeCap" DECIMAL(3,1),
ADD COLUMN     "sessionsAnalyzed" INTEGER;

-- AlterTable
ALTER TABLE "ExerciseLog" ADD COLUMN     "swapReason" TEXT,
ADD COLUMN     "swappedFromExerciseId" TEXT;

-- AlterTable
ALTER TABLE "ProgressionRecommendation" ADD COLUMN     "autoApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overriddenAt" TIMESTAMP(3),
ADD COLUMN     "overriddenById" TEXT,
ADD COLUMN     "overrideNote" TEXT,
ADD COLUMN     "overrideRepsMax" INTEGER,
ADD COLUMN     "overrideRepsMin" INTEGER,
ADD COLUMN     "overrideRpe" DECIMAL(3,1),
ADD COLUMN     "overrideWeightKg" DECIMAL(6,2),
ADD COLUMN     "settings" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "onboardedAt" TIMESTAMP(3),
ADD COLUMN     "weightUnit" "WeightUnit" NOT NULL DEFAULT 'KG';

-- CreateTable
CREATE TABLE "ClientProfile" (
    "clientId" TEXT NOT NULL,
    "goals" TEXT[],
    "goalNote" TEXT,
    "experience" "Experience",
    "daysPerWeek" INTEGER,
    "trainingDays" INTEGER[],
    "sessionLengthMin" INTEGER,
    "limitations" TEXT[],
    "limitationsNote" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("clientId")
);

-- CreateTable
CREATE TABLE "ClientBaseline" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "weightKg" DECIMAL(6,2),
    "reps" INTEGER,
    "unknown" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ClientBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachEngineRules" (
    "coachId" TEXT NOT NULL,
    "rpeCap" DECIMAL(3,1),
    "loadMarginRpe" DECIMAL(3,1),
    "highRpe" DECIMAL(3,1),
    "plateauTolerancePct" DECIMAL(4,2),
    "declineThresholdPct" DECIMAL(4,2),
    "deloadPercent" INTEGER,
    "sessionsAnalyzed" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachEngineRules_pkey" PRIMARY KEY ("coachId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientBaseline_clientId_exerciseId_key" ON "ClientBaseline"("clientId", "exerciseId");

-- AddForeignKey
ALTER TABLE "ExerciseLog" ADD CONSTRAINT "ExerciseLog_swappedFromExerciseId_fkey" FOREIGN KEY ("swappedFromExerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientBaseline" ADD CONSTRAINT "ClientBaseline_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientBaseline" ADD CONSTRAINT "ClientBaseline_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachEngineRules" ADD CONSTRAINT "CoachEngineRules_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Range checks Prisma cannot express (mirror ENGINE_LIMITS in @coaching/shared).
ALTER TABLE "CoachClient"
  ADD CONSTRAINT "CoachClient_rpeCap_range_check" CHECK ("rpeCap" IS NULL OR ("rpeCap" >= 1 AND "rpeCap" <= 10)),
  ADD CONSTRAINT "CoachClient_deloadPercent_range_check" CHECK ("deloadPercent" IS NULL OR ("deloadPercent" >= 5 AND "deloadPercent" <= 30)),
  ADD CONSTRAINT "CoachClient_sessionsAnalyzed_range_check" CHECK ("sessionsAnalyzed" IS NULL OR ("sessionsAnalyzed" >= 2 AND "sessionsAnalyzed" <= 5)),
  ADD CONSTRAINT "CoachClient_reps_range_check" CHECK ("repsMin" IS NULL OR "repsMax" IS NULL OR ("repsMin" >= 1 AND "repsMin" <= "repsMax")),
  ADD CONSTRAINT "CoachClient_increment_pos_check" CHECK ("loadIncrementKg" IS NULL OR "loadIncrementKg" > 0),
  ADD CONSTRAINT "CoachClient_autoApproveMax_pos_check" CHECK ("autoApproveMaxKg" IS NULL OR "autoApproveMaxKg" > 0);

ALTER TABLE "CoachEngineRules"
  ADD CONSTRAINT "CoachEngineRules_rpeCap_range_check" CHECK ("rpeCap" IS NULL OR ("rpeCap" >= 1 AND "rpeCap" <= 10)),
  ADD CONSTRAINT "CoachEngineRules_highRpe_range_check" CHECK ("highRpe" IS NULL OR ("highRpe" >= 1 AND "highRpe" <= 10)),
  ADD CONSTRAINT "CoachEngineRules_margin_range_check" CHECK ("loadMarginRpe" IS NULL OR ("loadMarginRpe" >= 0 AND "loadMarginRpe" <= 3)),
  ADD CONSTRAINT "CoachEngineRules_plateau_range_check" CHECK ("plateauTolerancePct" IS NULL OR ("plateauTolerancePct" >= 0 AND "plateauTolerancePct" <= 10)),
  ADD CONSTRAINT "CoachEngineRules_decline_range_check" CHECK ("declineThresholdPct" IS NULL OR ("declineThresholdPct" >= 0 AND "declineThresholdPct" <= 20)),
  ADD CONSTRAINT "CoachEngineRules_deloadPercent_range_check" CHECK ("deloadPercent" IS NULL OR ("deloadPercent" >= 5 AND "deloadPercent" <= 30)),
  ADD CONSTRAINT "CoachEngineRules_sessionsAnalyzed_range_check" CHECK ("sessionsAnalyzed" IS NULL OR ("sessionsAnalyzed" >= 2 AND "sessionsAnalyzed" <= 5));

ALTER TABLE "ProgressionRecommendation"
  ADD CONSTRAINT "ProgressionRecommendation_overrideRpe_range_check" CHECK ("overrideRpe" IS NULL OR ("overrideRpe" >= 1 AND "overrideRpe" <= 10)),
  ADD CONSTRAINT "ProgressionRecommendation_override_reps_check" CHECK ("overrideRepsMin" IS NULL OR "overrideRepsMax" IS NULL OR "overrideRepsMin" <= "overrideRepsMax"),
  ADD CONSTRAINT "ProgressionRecommendation_overrideWeight_check" CHECK ("overrideWeightKg" IS NULL OR "overrideWeightKg" >= 0);

ALTER TABLE "ClientBaseline"
  ADD CONSTRAINT "ClientBaseline_weight_nonneg_check" CHECK ("weightKg" IS NULL OR "weightKg" >= 0),
  ADD CONSTRAINT "ClientBaseline_reps_nonneg_check" CHECK ("reps" IS NULL OR "reps" >= 0);

ALTER TABLE "ClientProfile"
  ADD CONSTRAINT "ClientProfile_daysPerWeek_range_check" CHECK ("daysPerWeek" IS NULL OR ("daysPerWeek" >= 1 AND "daysPerWeek" <= 7)),
  ADD CONSTRAINT "ClientProfile_sessionLength_range_check" CHECK ("sessionLengthMin" IS NULL OR ("sessionLengthMin" >= 15 AND "sessionLengthMin" <= 240));
