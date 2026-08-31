-- CreateEnum
CREATE TYPE "DeployStack" AS ENUM ('NEXTJS', 'NESTJS');

-- CreateEnum
CREATE TYPE "DeployStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "DeployDomainMode" AS ENUM ('PRIMARY', 'SUBDOMAIN');

-- CreateTable
CREATE TABLE "app_deployments" (
    "id" TEXT NOT NULL,
    "hostingAccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stack" "DeployStack" NOT NULL,
    "domainMode" "DeployDomainMode" NOT NULL DEFAULT 'SUBDOMAIN',
    "subdomain" TEXT,
    "deployDomain" TEXT NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "branch" TEXT NOT NULL DEFAULT 'main',
    "rootDirectory" TEXT,
    "containerPort" INTEGER NOT NULL DEFAULT 3000,
    "hostPort" INTEGER NOT NULL,
    "envVarsEnc" TEXT,
    "status" "DeployStatus" NOT NULL DEFAULT 'PENDING',
    "stage" TEXT,
    "lastError" TEXT,
    "pleskSiteId" TEXT,
    "containerName" TEXT,
    "deployPath" TEXT,
    "lastDeployedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployment_runs" (
    "id" TEXT NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "status" "DeployStatus" NOT NULL DEFAULT 'RUNNING',
    "stage" TEXT,
    "log" TEXT NOT NULL DEFAULT '',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "deployment_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_deployments_hostingAccountId_idx" ON "app_deployments"("hostingAccountId");

-- CreateIndex
CREATE INDEX "app_deployments_userId_idx" ON "app_deployments"("userId");

-- CreateIndex
CREATE INDEX "app_deployments_hostPort_idx" ON "app_deployments"("hostPort");

-- CreateIndex
CREATE UNIQUE INDEX "app_deployments_hostingAccountId_name_key" ON "app_deployments"("hostingAccountId", "name");

-- CreateIndex
CREATE INDEX "deployment_runs_deploymentId_idx" ON "deployment_runs"("deploymentId");

-- AddForeignKey
ALTER TABLE "app_deployments" ADD CONSTRAINT "app_deployments_hostingAccountId_fkey" FOREIGN KEY ("hostingAccountId") REFERENCES "hosting_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_deployments" ADD CONSTRAINT "app_deployments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployment_runs" ADD CONSTRAINT "deployment_runs_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "app_deployments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
