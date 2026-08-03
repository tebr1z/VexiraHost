-- CreateEnum
CREATE TYPE "ManualServiceCategory" AS ENUM ('HOSTING', 'SERVER');

-- AlterTable
ALTER TABLE "hosting_accounts" ADD COLUMN "serviceCategory" "ManualServiceCategory";

-- Backfill existing manual accounts as HOSTING
UPDATE "hosting_accounts"
SET "serviceCategory" = 'HOSTING'
WHERE "managementMode" = 'MANUAL' AND "serviceCategory" IS NULL;

-- CreateIndex
CREATE INDEX "hosting_accounts_serviceCategory_idx" ON "hosting_accounts"("serviceCategory");
