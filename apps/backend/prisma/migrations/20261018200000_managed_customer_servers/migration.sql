CREATE TYPE "ManagedServerStatus" AS ENUM ('PENDING', 'ONLINE', 'DEGRADED', 'OFFLINE', 'ERROR');
CREATE TYPE "ManagedServerTaskType" AS ENUM ('CONNECTION_CHECK', 'INSTALL', 'SECURITY_SCAN', 'OPTIMIZATION_SCAN', 'SECURITY_FIX');
CREATE TYPE "ManagedServerTaskStatus" AS ENUM ('QUEUED', 'RUNNING', 'WAITING_APPROVAL', 'SUCCESS', 'FAILED');
CREATE TYPE "SecurityFindingSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "SecurityFindingStatus" AS ENUM ('OPEN', 'ACCEPTED', 'FIXED');

CREATE TABLE "managed_servers" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "host" TEXT NOT NULL,
  "sshPort" INTEGER NOT NULL DEFAULT 22,
  "sshUsername" TEXT NOT NULL,
  "sshPasswordEnc" TEXT NOT NULL,
  "packageCode" TEXT NOT NULL DEFAULT 'CUSTOM',
  "selectedFeatures" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" "ManagedServerStatus" NOT NULL DEFAULT 'PENDING',
  "osVersion" TEXT,
  "tools" JSONB,
  "cpuLoadPercent" INTEGER,
  "memoryUsedMb" INTEGER,
  "memoryTotalMb" INTEGER,
  "diskUsedMb" INTEGER,
  "diskTotalMb" INTEGER,
  "uptimeSeconds" INTEGER,
  "securityScore" INTEGER,
  "optimizationScore" INTEGER,
  "lastError" TEXT,
  "lastCheckedAt" TIMESTAMP(3),
  "lastSecurityScanAt" TIMESTAMP(3),
  "lastOptimizationAt" TIMESTAMP(3),
  "monitoringEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "managed_servers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "managed_servers_ssh_port_check" CHECK ("sshPort" BETWEEN 1 AND 65535)
);

CREATE TABLE "managed_server_tasks" (
  "id" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "type" "ManagedServerTaskType" NOT NULL,
  "status" "ManagedServerTaskStatus" NOT NULL DEFAULT 'QUEUED',
  "requestedFeatures" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "requestedById" TEXT,
  "approvedById" TEXT,
  "log" TEXT NOT NULL DEFAULT '',
  "result" JSONB,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "managed_server_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "managed_server_findings" (
  "id" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "severity" "SecurityFindingSeverity" NOT NULL,
  "status" "SecurityFindingStatus" NOT NULL DEFAULT 'OPEN',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "remediation" TEXT,
  "autoFixAvailable" BOOLEAN NOT NULL DEFAULT false,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "managed_server_findings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "managed_servers_userId_host_sshPort_key" ON "managed_servers"("userId", "host", "sshPort");
CREATE INDEX "managed_servers_userId_status_idx" ON "managed_servers"("userId", "status");
CREATE INDEX "managed_servers_monitoringEnabled_lastCheckedAt_idx" ON "managed_servers"("monitoringEnabled", "lastCheckedAt");
CREATE INDEX "managed_server_tasks_serverId_createdAt_idx" ON "managed_server_tasks"("serverId", "createdAt");
CREATE INDEX "managed_server_tasks_status_createdAt_idx" ON "managed_server_tasks"("status", "createdAt");
CREATE UNIQUE INDEX "managed_server_findings_serverId_key_key" ON "managed_server_findings"("serverId", "key");
CREATE INDEX "managed_server_findings_serverId_status_severity_idx" ON "managed_server_findings"("serverId", "status", "severity");

ALTER TABLE "managed_servers" ADD CONSTRAINT "managed_servers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "managed_server_tasks" ADD CONSTRAINT "managed_server_tasks_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "managed_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "managed_server_findings" ADD CONSTRAINT "managed_server_findings_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "managed_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
