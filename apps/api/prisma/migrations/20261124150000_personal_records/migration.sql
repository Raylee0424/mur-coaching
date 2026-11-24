-- CreateTable
CREATE TABLE "PersonalRecord" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "reps" INTEGER NOT NULL,
    "weightKg" DECIMAL(6,2) NOT NULL,
    "e1rmKg" DECIMAL(6,2) NOT NULL,
    "setLogId" TEXT NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonalRecord_setLogId_key" ON "PersonalRecord"("setLogId");

-- CreateIndex
CREATE INDEX "PersonalRecord_clientId_achievedAt_idx" ON "PersonalRecord"("clientId", "achievedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "PersonalRecord_clientId_exerciseId_reps_key" ON "PersonalRecord"("clientId", "exerciseId", "reps");

-- AddForeignKey
ALTER TABLE "PersonalRecord" ADD CONSTRAINT "PersonalRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalRecord" ADD CONSTRAINT "PersonalRecord_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalRecord" ADD CONSTRAINT "PersonalRecord_setLogId_fkey" FOREIGN KEY ("setLogId") REFERENCES "SetLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from existing logs: best working set per client, exercise and exact rep count
-- (heaviest wins, then the earliest session, then set id). Mirrors `computeRecords`.
INSERT INTO "PersonalRecord" ("id", "clientId", "exerciseId", "reps", "weightKg", "e1rmKg", "setLogId", "achievedAt")
SELECT DISTINCT ON (wl."clientId", el."exerciseId", s."reps")
    gen_random_uuid()::text,
    wl."clientId",
    el."exerciseId",
    s."reps",
    s."weightKg",
    ROUND(CASE WHEN s."reps" <= 1 THEN s."weightKg" ELSE s."weightKg" * (1 + s."reps" / 30.0) END, 2),
    s."id",
    wl."performedAt"
FROM "SetLog" s
JOIN "ExerciseLog" el ON el."id" = s."exerciseLogId"
JOIN "WorkoutLog" wl ON wl."id" = el."workoutLogId"
WHERE NOT s."isWarmup" AND s."reps" > 0 AND s."weightKg" > 0
ORDER BY wl."clientId", el."exerciseId", s."reps", s."weightKg" DESC, wl."performedAt" ASC, s."id" ASC;

-- Ranges Prisma cannot express.
ALTER TABLE "PersonalRecord"
  ADD CONSTRAINT "PersonalRecord_reps_check" CHECK ("reps" >= 1),
  ADD CONSTRAINT "PersonalRecord_weight_check" CHECK ("weightKg" > 0);
