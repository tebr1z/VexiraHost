-- CreateEnum
CREATE TYPE "DomainManagementMode" AS ENUM ('REGISTRAR', 'MANUAL');

-- CreateEnum
CREATE TYPE "DomainChangeType" AS ENUM ('DNS', 'NAMESERVER');

-- CreateEnum
CREATE TYPE "DomainChangeStatus" AS ENUM ('PENDING', 'APPLIED', 'DISMISSED');

-- AlterTable
ALTER TABLE "domains" ADD COLUMN "managementMode" "DomainManagementMode" NOT NULL DEFAULT 'REGISTRAR';
ALTER TABLE "domains" ADD COLUMN "registrarSource" TEXT;
ALTER TABLE "domains" ADD COLUMN "adminNotes" TEXT;

-- CreateIndex
CREATE INDEX "domains_managementMode_idx" ON "domains"("managementMode");

-- CreateTable
CREATE TABLE "domain_change_requests" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DomainChangeType" NOT NULL,
    "status" "DomainChangeStatus" NOT NULL DEFAULT 'PENDING',
    "previousData" JSONB NOT NULL,
    "requestedData" JSONB NOT NULL,
    "adminNotifiedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domain_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "domain_change_requests_domainId_idx" ON "domain_change_requests"("domainId");
CREATE INDEX "domain_change_requests_userId_idx" ON "domain_change_requests"("userId");
CREATE INDEX "domain_change_requests_status_idx" ON "domain_change_requests"("status");
CREATE INDEX "domain_change_requests_createdAt_idx" ON "domain_change_requests"("createdAt");

-- AddForeignKey
ALTER TABLE "domain_change_requests" ADD CONSTRAINT "domain_change_requests_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "domain_change_requests" ADD CONSTRAINT "domain_change_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
