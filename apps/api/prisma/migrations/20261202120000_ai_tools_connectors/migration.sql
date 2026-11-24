-- CreateEnum
CREATE TYPE "AiRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "AiUsageKind" AS ENUM ('COACH', 'WORKOUT', 'VOICE');

-- CreateEnum
CREATE TYPE "ConnectorScope" AS ENUM ('TRAINING', 'NUTRITION', 'BODYWEIGHT', 'CHECK_INS', 'READINESS');

-- CreateTable
CREATE TABLE "AiConversation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "AiRole" NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB NOT NULL DEFAULT '[]',
    "source" VARCHAR(8),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "clientId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "kind" "AiUsageKind" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("clientId","day","kind")
);

-- CreateTable
CREATE TABLE "ConnectorGrant" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "tokenPrefix" VARCHAR(16) NOT NULL,
    "scopes" "ConnectorScope"[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectorGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectorAudit" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "scope" "ConnectorScope",
    "path" VARCHAR(120) NOT NULL,
    "status" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectorAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiConversation_clientId_updatedAt_idx" ON "AiConversation"("clientId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "AiMessage_conversationId_createdAt_idx" ON "AiMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectorGrant_tokenHash_key" ON "ConnectorGrant"("tokenHash");

-- CreateIndex
CREATE INDEX "ConnectorGrant_clientId_idx" ON "ConnectorGrant"("clientId");

-- CreateIndex
CREATE INDEX "ConnectorAudit_grantId_createdAt_idx" ON "ConnectorAudit"("grantId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectorGrant" ADD CONSTRAINT "ConnectorGrant_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectorAudit" ADD CONSTRAINT "ConnectorAudit_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "ConnectorGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- Additive only. Rollback: DROP TABLE "ConnectorAudit", "ConnectorGrant", "AiUsage", "AiMessage", "AiConversation";
-- then DROP TYPE "ConnectorScope", "AiUsageKind", "AiRole".
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_count_check" CHECK ("count" >= 0);
ALTER TABLE "ConnectorGrant" ADD CONSTRAINT "ConnectorGrant_scopes_check" CHECK (cardinality("scopes") >= 1);
ALTER TABLE "ConnectorGrant" ADD CONSTRAINT "ConnectorGrant_hash_check" CHECK ("tokenHash" ~ '^[0-9a-f]{64}$');
