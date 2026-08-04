-- CreateEnum
CREATE TYPE "HostingDistributionMode" AS ENUM ('FAILOVER', 'BALANCED');

-- AlterTable
ALTER TABLE "hosting_plans" ADD COLUMN "distributionMode" "HostingDistributionMode" NOT NULL DEFAULT 'FAILOVER';

-- CreateTable
CREATE TABLE "hosting_plan_servers" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hosting_plan_servers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hosting_plan_servers_planId_priority_idx" ON "hosting_plan_servers"("planId", "priority");

-- CreateIndex
CREATE INDEX "hosting_plan_servers_serverId_idx" ON "hosting_plan_servers"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "hosting_plan_servers_planId_serverId_key" ON "hosting_plan_servers"("planId", "serverId");

-- AddForeignKey
ALTER TABLE "hosting_plan_servers" ADD CONSTRAINT "hosting_plan_servers_planId_fkey" FOREIGN KEY ("planId") REFERENCES "hosting_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hosting_plan_servers" ADD CONSTRAINT "hosting_plan_servers_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "hosting_servers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill join rows from legacy single serverId
INSERT INTO "hosting_plan_servers" ("id", "planId", "serverId", "priority", "isActive", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), "id", "serverId", 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "hosting_plans"
WHERE "serverId" IS NOT NULL
ON CONFLICT ("planId", "serverId") DO NOTHING;
