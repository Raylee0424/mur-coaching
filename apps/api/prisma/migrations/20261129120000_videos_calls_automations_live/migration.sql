-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('VIDEO', 'AUDIO');

-- CreateEnum
CREATE TYPE "VideoSide" AS ENUM ('LEFT', 'RIGHT', 'BOTH');

-- CreateEnum
CREATE TYPE "FormReviewStatus" AS ENUM ('PENDING', 'REVIEWED');

-- CreateEnum
CREATE TYPE "CallKind" AS ENUM ('CHECK_IN', 'ONBOARDING');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('PAYMENT_RECEIVED', 'SESSION_MISSED', 'CHECK_IN_OVERDUE');

-- CreateEnum
CREATE TYPE "LiveMode" AS ENUM ('REMOTE', 'IN_PERSON');

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "demoUrl" VARCHAR(300);

-- AlterTable
ALTER TABLE "SetLog" ADD COLUMN     "requestId" UUID;

-- AlterTable
ALTER TABLE "WorkoutLog" ADD COLUMN     "loggedById" TEXT;

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "contentType" VARCHAR(40) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetVideo" (
    "id" TEXT NOT NULL,
    "setLogId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "side" "VideoSide" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SetVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormReview" (
    "id" TEXT NOT NULL,
    "setVideoId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "status" "FormReviewStatus" NOT NULL DEFAULT 'PENDING',
    "summary" VARCHAR(2000),
    "audioMediaId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "FormReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoAnnotation" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "timestampMs" INTEGER NOT NULL,
    "shapes" JSONB NOT NULL,
    "note" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "timezone" VARCHAR(64) NOT NULL,
    "windows" JSONB NOT NULL,
    "meetingUrl" VARCHAR(500),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "kind" "CallKind" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "agenda" VARCHAR(300),
    "meetingUrl" VARCHAR(500),
    "bookedById" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "trigger" "AutomationTrigger" NOT NULL,
    "delayHours" INTEGER NOT NULL,
    "messageBody" VARCHAR(1000) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRun" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "idempotencyKey" VARCHAR(200) NOT NULL,
    "messageId" TEXT,
    "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveSession" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "mode" "LiveMode" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "workoutLogId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");

-- CreateIndex
CREATE INDEX "MediaAsset_ownerId_kind_idx" ON "MediaAsset"("ownerId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "SetVideo_mediaId_key" ON "SetVideo"("mediaId");

-- CreateIndex
CREATE INDEX "SetVideo_clientId_createdAt_idx" ON "SetVideo"("clientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SetVideo_setLogId_side_key" ON "SetVideo"("setLogId", "side");

-- CreateIndex
CREATE UNIQUE INDEX "FormReview_setVideoId_key" ON "FormReview"("setVideoId");

-- CreateIndex
CREATE UNIQUE INDEX "FormReview_audioMediaId_key" ON "FormReview"("audioMediaId");

-- CreateIndex
CREATE INDEX "FormReview_coachId_status_requestedAt_idx" ON "FormReview"("coachId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "VideoAnnotation_reviewId_timestampMs_idx" ON "VideoAnnotation"("reviewId", "timestampMs");

-- CreateIndex
CREATE UNIQUE INDEX "Availability_coachId_key" ON "Availability"("coachId");

-- CreateIndex
CREATE INDEX "Booking_coachId_status_startsAt_idx" ON "Booking"("coachId", "status", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_clientId_status_startsAt_idx" ON "Booking"("clientId", "status", "startsAt");

-- CreateIndex
CREATE INDEX "AutomationRule_coachId_idx" ON "AutomationRule"("coachId");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationRun_idempotencyKey_key" ON "AutomationRun"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AutomationRun_ruleId_firedAt_idx" ON "AutomationRun"("ruleId", "firedAt");

-- CreateIndex
CREATE INDEX "LiveSession_coachId_startedAt_idx" ON "LiveSession"("coachId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LiveParticipant_workoutLogId_key" ON "LiveParticipant"("workoutLogId");

-- CreateIndex
CREATE INDEX "LiveParticipant_clientId_idx" ON "LiveParticipant"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveParticipant_sessionId_clientId_key" ON "LiveParticipant"("sessionId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "SetLog_requestId_key" ON "SetLog"("requestId");

-- AddForeignKey
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetVideo" ADD CONSTRAINT "SetVideo_setLogId_fkey" FOREIGN KEY ("setLogId") REFERENCES "SetLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetVideo" ADD CONSTRAINT "SetVideo_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetVideo" ADD CONSTRAINT "SetVideo_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormReview" ADD CONSTRAINT "FormReview_setVideoId_fkey" FOREIGN KEY ("setVideoId") REFERENCES "SetVideo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormReview" ADD CONSTRAINT "FormReview_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormReview" ADD CONSTRAINT "FormReview_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormReview" ADD CONSTRAINT "FormReview_audioMediaId_fkey" FOREIGN KEY ("audioMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAnnotation" ADD CONSTRAINT "VideoAnnotation_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "FormReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveParticipant" ADD CONSTRAINT "LiveParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveParticipant" ADD CONSTRAINT "LiveParticipant_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveParticipant" ADD CONSTRAINT "LiveParticipant_workoutLogId_fkey" FOREIGN KEY ("workoutLogId") REFERENCES "WorkoutLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Hand-written constraints (not expressible in the Prisma schema).
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_size_check" CHECK ("sizeBytes" > 0);
ALTER TABLE "VideoAnnotation" ADD CONSTRAINT "VideoAnnotation_timestamp_check" CHECK ("timestampMs" >= 0);
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_range_check" CHECK ("endsAt" > "startsAt");
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_delay_check" CHECK ("delayHours" BETWEEN 0 AND 336);
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_range_check" CHECK ("endedAt" IS NULL OR "endedAt" >= "startedAt");

ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_demoUrl_check" CHECK ("demoUrl" IS NULL OR "demoUrl" LIKE 'https://%');

-- One open live session per coach.
CREATE UNIQUE INDEX "LiveSession_one_open_per_coach" ON "LiveSession" ("coachId") WHERE "endedAt" IS NULL;
