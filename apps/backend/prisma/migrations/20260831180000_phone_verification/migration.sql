-- AlterTable
ALTER TABLE "users" ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "email_login_otps" ADD COLUMN "pendingPhone" TEXT;
