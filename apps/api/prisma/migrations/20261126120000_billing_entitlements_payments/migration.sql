-- CreateEnum
CREATE TYPE "Feature" AS ENUM ('AI_COACH', 'AI_WORKOUT_GENERATOR', 'VOICE_LOGGING', 'PROGRAM_CREATION', 'PERSONAL_RECORDS', 'EXERCISE_STATS', 'MUSCLE_ANALYTICS', 'AI_FOOD_PHOTOS', 'COACH_CLIENTS', 'CLIENT_PAYMENTS');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "BillingEventType" AS ENUM ('TRIAL_STARTED', 'CHECKOUT_COMPLETED', 'SUBSCRIPTION_UPDATED', 'SUBSCRIPTION_CANCELED', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED');

-- CreateEnum
CREATE TYPE "OfferInterval" AS ENUM ('ONE_TIME', 'MONTH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('SUCCEEDED', 'FAILED', 'REFUNDED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stripeAccountId" TEXT,
ADD COLUMN     "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "clientLimit" INTEGER,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entitlement" (
    "planId" TEXT NOT NULL,
    "feature" "Feature" NOT NULL,

    CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("planId","feature")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "clientLimit" INTEGER,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BillingEventType" NOT NULL,
    "planId" TEXT,
    "status" "SubscriptionStatus",
    "amountCents" INTEGER,
    "stripeEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachOffer" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "interval" "OfferInterval" NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientSubscription" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "stripeSubscriptionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "offerId" TEXT,
    "clientSubscriptionId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "PaymentStatus" NOT NULL,
    "stripeRef" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "BillingEvent_userId_createdAt_idx" ON "BillingEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CoachOffer_coachId_archivedAt_idx" ON "CoachOffer"("coachId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClientSubscription_stripeSubscriptionId_key" ON "ClientSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "ClientSubscription_coachId_status_idx" ON "ClientSubscription"("coachId", "status");

-- CreateIndex
CREATE INDEX "ClientSubscription_clientId_idx" ON "ClientSubscription"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeRef_key" ON "Payment"("stripeRef");

-- CreateIndex
CREATE INDEX "Payment_coachId_paidAt_idx" ON "Payment"("coachId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeAccountId_key" ON "User"("stripeAccountId");

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachOffer" ADD CONSTRAINT "CoachOffer_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSubscription" ADD CONSTRAINT "ClientSubscription_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "CoachOffer"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSubscription" ADD CONSTRAINT "ClientSubscription_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSubscription" ADD CONSTRAINT "ClientSubscription_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "CoachOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_clientSubscriptionId_fkey" FOREIGN KEY ("clientSubscriptionId") REFERENCES "ClientSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- One audit row per Stripe event (NULLs, e.g. TRIAL_STARTED, are not constrained).
CREATE UNIQUE INDEX "BillingEvent_stripeEventId_key" ON "BillingEvent"("stripeEventId");

-- Positive money, sane seats.
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_priceCents_check" CHECK ("priceCents" >= 0);
ALTER TABLE "CoachOffer" ADD CONSTRAINT "CoachOffer_priceCents_check" CHECK ("priceCents" >= 50);
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_clientLimit_check" CHECK ("clientLimit" IS NULL OR "clientLimit" >= 0);

-- Plan catalog (mirrors PLANS in @coaching/shared; the seed upserts the same values).
INSERT INTO "Plan" ("id", "name", "role", "priceCents", "currency", "trialDays", "clientLimit") VALUES
  ('athlete-free', 'Athletes Free', 'CLIENT', 0, 'usd', 0, NULL),
  ('athlete-pro', 'Athletes Pro', 'CLIENT', 1199, 'usd', 0, NULL),
  ('coach', 'Coaches', 'COACH', 1999, 'usd', 14, 5);

INSERT INTO "Entitlement" ("planId", "feature") VALUES
  ('athlete-pro', 'AI_COACH'),
  ('athlete-pro', 'AI_WORKOUT_GENERATOR'),
  ('athlete-pro', 'VOICE_LOGGING'),
  ('athlete-pro', 'PROGRAM_CREATION'),
  ('athlete-pro', 'PERSONAL_RECORDS'),
  ('athlete-pro', 'EXERCISE_STATS'),
  ('athlete-pro', 'MUSCLE_ANALYTICS'),
  ('athlete-pro', 'AI_FOOD_PHOTOS'),
  ('coach', 'COACH_CLIENTS'),
  ('coach', 'CLIENT_PAYMENTS');

-- Existing coaches start a 14-day trial today so nobody loses the ability to add clients on deploy.
-- Seats cover their current roster (ACTIVE and PAUSED hold seats) so nobody is over the limit on day one.
INSERT INTO "Subscription" ("id", "userId", "planId", "status", "clientLimit", "trialEndsAt", "createdAt", "updatedAt")
SELECT 'sub_' || u."id", u."id", 'coach', 'TRIALING',
       GREATEST(5, (SELECT COUNT(*) FROM "CoachClient" cc WHERE cc."coachId" = u."id" AND cc."status" IN ('ACTIVE', 'PAUSED')))::int,
       NOW() + INTERVAL '14 days', NOW(), NOW()
FROM "User" u
WHERE u."role" = 'COACH';

INSERT INTO "BillingEvent" ("id", "userId", "type", "planId", "status", "createdAt")
SELECT 'bev_' || u."id", u."id", 'TRIAL_STARTED', 'coach', 'TRIALING', NOW()
FROM "User" u
WHERE u."role" = 'COACH';
