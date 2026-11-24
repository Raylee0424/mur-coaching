-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW', 'INTAKE_SENT', 'CALL_BOOKED', 'ACTIVE', 'LOST');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEB_FORM', 'MANUAL');

-- CreateEnum
CREATE TYPE "ResourceKind" AS ENUM ('GUIDE', 'VIDEO', 'SHEET', 'OTHER');

-- AlterTable
ALTER TABLE "Invite" ADD COLUMN     "leadId" TEXT;

-- CreateTable
CREATE TABLE "CoachBrand" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "headline" VARCHAR(120) NOT NULL,
    "intro" VARCHAR(500) NOT NULL DEFAULT '',
    "acceptingLeads" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeForm" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "questions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" TEXT NOT NULL,
    "phone" VARCHAR(40),
    "goal" VARCHAR(80),
    "trainingDays" INTEGER,
    "experienceYears" INTEGER,
    "source" "LeadSource" NOT NULL,
    "stage" "LeadStage" NOT NULL DEFAULT 'NEW',
    "monthlyValueCents" INTEGER,
    "callAt" TIMESTAMP(3),
    "notes" VARCHAR(2000),
    "convertedClientId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeResponse" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "formId" TEXT,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "kind" "ResourceKind" NOT NULL,
    "fileName" VARCHAR(200) NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceShare" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientRoadmap" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "notes" VARCHAR(1000),
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientRoadmap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapPhase" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "focus" VARCHAR(120),
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "programId" TEXT,

    CONSTRAINT "RoadmapPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapGoal" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "label" VARCHAR(60) NOT NULL,
    "unit" VARCHAR(12) NOT NULL,
    "targetValue" DECIMAL(8,2) NOT NULL,
    "currentValue" DECIMAL(8,2),
    "dueDate" DATE,

    CONSTRAINT "RoadmapGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientEvent" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "date" DATE NOT NULL,
    "location" VARCHAR(120),
    "notes" VARCHAR(500),

    CONSTRAINT "ClientEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachBrand_coachId_key" ON "CoachBrand"("coachId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachBrand_slug_key" ON "CoachBrand"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeForm_coachId_key" ON "IntakeForm"("coachId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_convertedClientId_key" ON "Lead"("convertedClientId");

-- CreateIndex
CREATE INDEX "Lead_coachId_stage_idx" ON "Lead"("coachId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_coachId_email_key" ON "Lead"("coachId", "email");

-- CreateIndex
CREATE INDEX "IntakeResponse_leadId_idx" ON "IntakeResponse"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_storageKey_key" ON "Resource"("storageKey");

-- CreateIndex
CREATE INDEX "Resource_coachId_createdAt_idx" ON "Resource"("coachId", "createdAt");

-- CreateIndex
CREATE INDEX "ResourceShare_clientId_idx" ON "ResourceShare"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceShare_resourceId_clientId_key" ON "ResourceShare"("resourceId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientRoadmap_clientId_key" ON "ClientRoadmap"("clientId");

-- CreateIndex
CREATE INDEX "ClientRoadmap_coachId_idx" ON "ClientRoadmap"("coachId");

-- CreateIndex
CREATE INDEX "RoadmapPhase_roadmapId_position_idx" ON "RoadmapPhase"("roadmapId", "position");

-- CreateIndex
CREATE INDEX "RoadmapGoal_roadmapId_position_idx" ON "RoadmapGoal"("roadmapId", "position");

-- CreateIndex
CREATE INDEX "ClientEvent_clientId_date_idx" ON "ClientEvent"("clientId", "date");

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachBrand" ADD CONSTRAINT "CoachBrand_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeForm" ADD CONSTRAINT "IntakeForm_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedClientId_fkey" FOREIGN KEY ("convertedClientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeResponse" ADD CONSTRAINT "IntakeResponse_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeResponse" ADD CONSTRAINT "IntakeResponse_formId_fkey" FOREIGN KEY ("formId") REFERENCES "IntakeForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceShare" ADD CONSTRAINT "ResourceShare_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceShare" ADD CONSTRAINT "ResourceShare_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientRoadmap" ADD CONSTRAINT "ClientRoadmap_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientRoadmap" ADD CONSTRAINT "ClientRoadmap_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapPhase" ADD CONSTRAINT "RoadmapPhase_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "ClientRoadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapPhase" ADD CONSTRAINT "RoadmapPhase_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapGoal" ADD CONSTRAINT "RoadmapGoal_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "ClientRoadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientEvent" ADD CONSTRAINT "ClientEvent_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "ClientRoadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientEvent" ADD CONSTRAINT "ClientEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

