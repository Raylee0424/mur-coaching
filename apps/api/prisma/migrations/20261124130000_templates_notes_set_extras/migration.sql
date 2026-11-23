-- AlterTable
ALTER TABLE "ExerciseLog" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "SetLog" ADD COLUMN     "restSeconds" INTEGER,
ADD COLUMN     "rir" INTEGER,
ADD COLUMN     "tempo" VARCHAR(16);

-- CreateTable
CREATE TABLE "TemplateFolder" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutTemplate" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "folderId" TEXT,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutTemplateExercise" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "targetSets" INTEGER NOT NULL,
    "repsMin" INTEGER,
    "repsMax" INTEGER,
    "restSeconds" INTEGER,
    "tempo" VARCHAR(16),

    CONSTRAINT "WorkoutTemplateExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseNote" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TemplateFolder_clientId_name_key" ON "TemplateFolder"("clientId", "name");

-- CreateIndex
CREATE INDEX "WorkoutTemplate_clientId_folderId_idx" ON "WorkoutTemplate"("clientId", "folderId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutTemplateExercise_templateId_order_key" ON "WorkoutTemplateExercise"("templateId", "order");

-- CreateIndex
CREATE INDEX "ExerciseNote_clientId_exerciseId_idx" ON "ExerciseNote"("clientId", "exerciseId");

-- AddForeignKey
ALTER TABLE "TemplateFolder" ADD CONSTRAINT "TemplateFolder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "TemplateFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplateExercise" ADD CONSTRAINT "WorkoutTemplateExercise_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplateExercise" ADD CONSTRAINT "WorkoutTemplateExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseNote" ADD CONSTRAINT "ExerciseNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseNote" ADD CONSTRAINT "ExerciseNote_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ranges Prisma cannot express.
ALTER TABLE "SetLog"
  ADD CONSTRAINT "SetLog_rir_check" CHECK ("rir" IS NULL OR "rir" BETWEEN 0 AND 10),
  ADD CONSTRAINT "SetLog_restSeconds_check" CHECK ("restSeconds" IS NULL OR "restSeconds" BETWEEN 0 AND 3600);

ALTER TABLE "WorkoutTemplateExercise"
  ADD CONSTRAINT "WorkoutTemplateExercise_sets_check" CHECK ("targetSets" BETWEEN 1 AND 50),
  ADD CONSTRAINT "WorkoutTemplateExercise_reps_check" CHECK (
    ("repsMin" IS NULL OR "repsMin" >= 1) AND ("repsMax" IS NULL OR "repsMax" >= COALESCE("repsMin", 1))
  ),
  ADD CONSTRAINT "WorkoutTemplateExercise_rest_check" CHECK ("restSeconds" IS NULL OR "restSeconds" BETWEEN 0 AND 3600);
