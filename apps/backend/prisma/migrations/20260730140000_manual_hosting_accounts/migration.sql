-- CreateEnum
CREATE TYPE "HostingManagementMode" AS ENUM ('AUTOMATED', 'MANUAL');

-- AlterTable
ALTER TABLE "hosting_accounts" ADD COLUMN "managementMode" "HostingManagementMode" NOT NULL DEFAULT 'AUTOMATED';
ALTER TABLE "hosting_accounts" ADD COLUMN "panelIp" TEXT;
ALTER TABLE "hosting_accounts" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "hosting_accounts_managementMode_idx" ON "hosting_accounts"("managementMode");
