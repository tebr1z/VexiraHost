-- CreateEnum
CREATE TYPE "HostingPanel" AS ENUM ('CPANEL', 'PLESK');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('PROVISIONING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "hosting_plans" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "panel" "HostingPanel" NOT NULL,
    "diskGb" INTEGER NOT NULL,
    "bandwidthGb" INTEGER NOT NULL,
    "maxDomains" INTEGER NOT NULL,
    "maxEmails" INTEGER NOT NULL,
    "maxDatabases" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hosting_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hosting_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "primaryDomain" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "panel" "HostingPanel" NOT NULL,
    "status" "ServiceStatus" NOT NULL DEFAULT 'PROVISIONING',
    "panelUrl" TEXT,
    "panelUsername" TEXT,
    "panelRef" TEXT,
    "provisionedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hosting_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hosting_plans_slug_key" ON "hosting_plans"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "hosting_accounts_primaryDomain_key" ON "hosting_accounts"("primaryDomain");

-- CreateIndex
CREATE UNIQUE INDEX "hosting_accounts_username_key" ON "hosting_accounts"("username");

-- CreateIndex
CREATE INDEX "hosting_accounts_userId_idx" ON "hosting_accounts"("userId");

-- CreateIndex
CREATE INDEX "hosting_accounts_planId_idx" ON "hosting_accounts"("planId");

-- AddForeignKey
ALTER TABLE "hosting_accounts" ADD CONSTRAINT "hosting_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hosting_accounts" ADD CONSTRAINT "hosting_accounts_planId_fkey" FOREIGN KEY ("planId") REFERENCES "hosting_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
