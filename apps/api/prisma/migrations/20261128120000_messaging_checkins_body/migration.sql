-- CreateEnum
CREATE TYPE "CheckInQuestionKind" AS ENUM ('NUMBER', 'SCALE', 'TEXT');

-- CreateEnum
CREATE TYPE "CheckInCadence" AS ENUM ('WEEKLY', 'ONCE');

-- CreateEnum
CREATE TYPE "PhotoPose" AS ENUM ('FRONT', 'SIDE', 'BACK');

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" VARCHAR(4000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageRead" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInTemplate" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckInTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInQuestion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "prompt" VARCHAR(200) NOT NULL,
    "kind" "CheckInQuestionKind" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "unit" VARCHAR(12),

    CONSTRAINT "CheckInQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInSchedule" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "cadence" "CheckInCadence" NOT NULL,
    "weekday" INTEGER,
    "dueDate" DATE,
    "startDate" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckInSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInResponse" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "periodDate" DATE NOT NULL,
    "answers" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "coachReply" VARCHAR(2000),
    "repliedAt" TIMESTAMP(3),

    CONSTRAINT "CheckInResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyweightEntry" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "weightKg" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BodyweightEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyGoal" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "targetKg" DECIMAL(5,2) NOT NULL,
    "targetDate" DATE,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BodyGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressPhoto" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "pose" "PhotoPose" NOT NULL,
    "takenOn" DATE NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sharedWithCoach" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversation_coachId_lastMessageAt_idx" ON "Conversation"("coachId", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_coachId_clientId_key" ON "Conversation"("coachId", "clientId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_id_idx" ON "Message"("conversationId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "MessageRead_conversationId_userId_key" ON "MessageRead"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "CheckInTemplate_coachId_idx" ON "CheckInTemplate"("coachId");

-- CreateIndex
CREATE INDEX "CheckInQuestion_templateId_position_idx" ON "CheckInQuestion"("templateId", "position");

-- CreateIndex
CREATE INDEX "CheckInSchedule_clientId_active_idx" ON "CheckInSchedule"("clientId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CheckInSchedule_templateId_clientId_key" ON "CheckInSchedule"("templateId", "clientId");

-- CreateIndex
CREATE INDEX "CheckInResponse_clientId_submittedAt_idx" ON "CheckInResponse"("clientId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CheckInResponse_scheduleId_periodDate_key" ON "CheckInResponse"("scheduleId", "periodDate");

-- CreateIndex
CREATE UNIQUE INDEX "BodyweightEntry_clientId_date_key" ON "BodyweightEntry"("clientId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BodyGoal_clientId_key" ON "BodyGoal"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressPhoto_storageKey_key" ON "ProgressPhoto"("storageKey");

-- CreateIndex
CREATE INDEX "ProgressPhoto_clientId_takenOn_idx" ON "ProgressPhoto"("clientId", "takenOn");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageRead" ADD CONSTRAINT "MessageRead_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageRead" ADD CONSTRAINT "MessageRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInTemplate" ADD CONSTRAINT "CheckInTemplate_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInQuestion" ADD CONSTRAINT "CheckInQuestion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CheckInTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInSchedule" ADD CONSTRAINT "CheckInSchedule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CheckInTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInSchedule" ADD CONSTRAINT "CheckInSchedule_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInResponse" ADD CONSTRAINT "CheckInResponse_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "CheckInSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInResponse" ADD CONSTRAINT "CheckInResponse_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyweightEntry" ADD CONSTRAINT "BodyweightEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyGoal" ADD CONSTRAINT "BodyGoal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressPhoto" ADD CONSTRAINT "ProgressPhoto_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

