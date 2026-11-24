-- CreateTable
CREATE TABLE "ReadinessSurvey" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "sleepQuality" INTEGER NOT NULL,
    "sleepHours" DECIMAL(3,1),
    "soreness" INTEGER NOT NULL,
    "stress" INTEGER NOT NULL,
    "motivation" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "note" VARCHAR(280),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadinessSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "sharedWithCoach" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CycleLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReadinessSurvey_clientId_date_key" ON "ReadinessSurvey"("clientId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CycleLog_clientId_date_key" ON "CycleLog"("clientId", "date");

-- AddForeignKey
ALTER TABLE "ReadinessSurvey" ADD CONSTRAINT "ReadinessSurvey_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleLog" ADD CONSTRAINT "CycleLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Survey scales and ranges
ALTER TABLE "ReadinessSurvey" ADD CONSTRAINT "ReadinessSurvey_scales_check" CHECK (
  "sleepQuality" BETWEEN 1 AND 5 AND "soreness" BETWEEN 1 AND 5 AND "stress" BETWEEN 1 AND 5 AND "motivation" BETWEEN 1 AND 5
);
ALTER TABLE "ReadinessSurvey" ADD CONSTRAINT "ReadinessSurvey_score_check" CHECK ("score" BETWEEN 0 AND 100);
ALTER TABLE "ReadinessSurvey" ADD CONSTRAINT "ReadinessSurvey_hours_check" CHECK ("sleepHours" IS NULL OR "sleepHours" BETWEEN 0 AND 16);
