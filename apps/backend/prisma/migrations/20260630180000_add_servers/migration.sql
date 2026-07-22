-- CreateEnum
CREATE TYPE "ServerType" AS ENUM ('VPS', 'DEDICATED');

-- CreateEnum
CREATE TYPE "ServerStatus" AS ENUM ('PROVISIONING', 'RUNNING', 'STOPPED', 'SUSPENDED', 'ERROR');

-- CreateEnum
CREATE TYPE "ServerPowerAction" AS ENUM ('START', 'STOP', 'REBOOT', 'SHUTDOWN');

-- CreateTable
CREATE TABLE "server_plans" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ServerType" NOT NULL,
    "cpuCores" INTEGER NOT NULL,
    "ramGb" INTEGER NOT NULL,
    "diskGb" INTEGER NOT NULL,
    "bandwidthGbps" DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "regions" TEXT[] DEFAULT ARRAY['fra-01', 'nyc-01', 'sin-01']::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "server_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "type" "ServerType" NOT NULL,
    "status" "ServerStatus" NOT NULL DEFAULT 'PROVISIONING',
    "region" TEXT NOT NULL,
    "ipv4" TEXT,
    "osTemplate" TEXT NOT NULL DEFAULT 'ubuntu-22.04',
    "proxmoxVmId" TEXT,
    "proxmoxNode" TEXT,
    "cpuCores" INTEGER NOT NULL,
    "ramGb" INTEGER NOT NULL,
    "diskGb" INTEGER NOT NULL,
    "provisionedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "server_power_logs" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "action" "ServerPowerAction" NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "server_power_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "server_plans_slug_key" ON "server_plans"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "servers_hostname_key" ON "servers"("hostname");

-- CreateIndex
CREATE INDEX "servers_userId_idx" ON "servers"("userId");

-- CreateIndex
CREATE INDEX "servers_planId_idx" ON "servers"("planId");

-- CreateIndex
CREATE INDEX "server_power_logs_serverId_idx" ON "server_power_logs"("serverId");

-- AddForeignKey
ALTER TABLE "servers" ADD CONSTRAINT "servers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servers" ADD CONSTRAINT "servers_planId_fkey" FOREIGN KEY ("planId") REFERENCES "server_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "server_power_logs" ADD CONSTRAINT "server_power_logs_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
