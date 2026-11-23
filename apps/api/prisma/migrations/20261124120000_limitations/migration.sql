-- CreateEnum
CREATE TYPE "LimitationTarget" AS ENUM ('MUSCLE', 'EXERCISE');

-- CreateEnum
CREATE TYPE "LimitationSeverity" AS ENUM ('AVOID', 'CAUTION');

-- CreateTable
CREATE TABLE "Limitation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "target" "LimitationTarget" NOT NULL,
    "muscleGroup" "MuscleGroup",
    "exerciseId" TEXT,
    "severity" "LimitationSeverity" NOT NULL,
    "note" TEXT,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Limitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Limitation_clientId_endsOn_idx" ON "Limitation"("clientId", "endsOn");

-- AddForeignKey
ALTER TABLE "Limitation" ADD CONSTRAINT "Limitation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Limitation" ADD CONSTRAINT "Limitation_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Exactly one target column per row, and a sane date range (Prisma cannot express these).
ALTER TABLE "Limitation"
  ADD CONSTRAINT "Limitation_target_check" CHECK (
    ("target" = 'MUSCLE' AND "muscleGroup" IS NOT NULL AND "exerciseId" IS NULL)
    OR ("target" = 'EXERCISE' AND "exerciseId" IS NOT NULL AND "muscleGroup" IS NULL)
  ),
  ADD CONSTRAINT "Limitation_dates_check" CHECK ("endsOn" IS NULL OR "endsOn" >= "startsOn");
