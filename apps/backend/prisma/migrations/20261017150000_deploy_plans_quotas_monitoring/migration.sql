CREATE TYPE "DeployNodeHealth" AS ENUM ('UNKNOWN', 'HEALTHY', 'DEGRADED', 'DOWN');

ALTER TABLE "hosting_servers"
ADD COLUMN "deployNodeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deployHealth" "DeployNodeHealth" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "deployHealthMessage" TEXT,
ADD COLUMN "deployHealthCheckedAt" TIMESTAMP(3),
ADD COLUMN "deployCpuLoadPercent" INTEGER,
ADD COLUMN "deployMemoryUsedMb" INTEGER,
ADD COLUMN "deployMemoryTotalMb" INTEGER,
ADD COLUMN "deployDiskUsedMb" INTEGER,
ADD COLUMN "deployDiskTotalMb" INTEGER,
ADD COLUMN "deployUptimeSeconds" INTEGER;

ALTER TABLE "hosting_plans"
ADD COLUMN "autoDeployDiskGb" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "autoDeployMaxApps" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "autoDeployAiEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "autoDeployAiMonthlyCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "autoDeploySecurityScanEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "autoDeployServerId" TEXT;

ALTER TABLE "hosting_accounts"
ADD COLUMN "autoDeployDiskGbOverride" INTEGER,
ADD COLUMN "autoDeployMaxAppsOverride" INTEGER,
ADD COLUMN "autoDeployAiCreditsOverride" INTEGER,
ADD COLUMN "autoDeployDiskUsedMb" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "pleskDiskUsedMb" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "storageCheckedAt" TIMESTAMP(3);

ALTER TABLE "app_deployments" ADD COLUMN "deployServerId" TEXT;

UPDATE "app_deployments" d
SET "deployServerId" = h."serverId"
FROM "hosting_accounts" h
WHERE d."hostingAccountId" = h.id;

CREATE INDEX "hosting_plans_autoDeployServerId_idx" ON "hosting_plans"("autoDeployServerId");
CREATE INDEX "app_deployments_deployServerId_idx" ON "app_deployments"("deployServerId");

ALTER TABLE "hosting_plans"
ADD CONSTRAINT "hosting_plans_autoDeployServerId_fkey"
FOREIGN KEY ("autoDeployServerId") REFERENCES "hosting_servers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "app_deployments"
ADD CONSTRAINT "app_deployments_deployServerId_fkey"
FOREIGN KEY ("deployServerId") REFERENCES "hosting_servers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
