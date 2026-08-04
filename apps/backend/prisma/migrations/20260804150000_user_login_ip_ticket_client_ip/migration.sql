-- AlterTable
ALTER TABLE "users" ADD COLUMN "lastLoginIp" TEXT,
ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN "clientIp" TEXT;
